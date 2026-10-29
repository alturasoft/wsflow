import sys
import io
import json
import urllib.request
import paramiko

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOSTNAME = "129.121.63.105"
PORT = 22022
USERNAME = "root"
PASSWORD = "vPS*#220669"

def main():
    print("======================================================")
    print("   WSFlow - Sincronizador de Flujos Local -> VPS      ")
    print("======================================================")

    # 1. Obtener flujos completos de local
    print("\n[1/3] Extrayendo flujos desde el entorno local (:3000)...")
    try:
        req = urllib.request.urlopen("http://localhost:3000/api/flows")
        flows_summary = json.loads(req.read().decode('utf-8'))
    except Exception as e:
        print(f"[ERROR] No se pudo conectar con el backend local: {e}")
        print("Asegúrate de que start.bat esté ejecutándose en tu PC.")
        sys.exit(1)

    full_flows = []
    for f in flows_summary:
        fid = f['id']
        req_detail = urllib.request.urlopen(f"http://localhost:3000/api/flows/{fid}")
        detail = json.loads(req_detail.read().decode('utf-8'))
        full_flows.append(detail)

    print(f"  ✓ {len(full_flows)} flujos extraídos localmente:")
    for f in full_flows:
        vers = len(f.get('versions', []))
        print(f"    - {f['name']} (Versiones: {vers}, Palabras clave: {f.get('triggerKeywords', [])})")

    # 2. Conectar a VPS y obtener tenant y user
    print(f"\n[2/3] Conectando a la VPS ({HOSTNAME}:{PORT})...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOSTNAME, port=PORT, username=USERNAME, password=PASSWORD, timeout=15)

    try:
        # Script en VPS para insertar / actualizar flujos con Prisma o SQL
        payload = json.dumps(full_flows)
        
        # Guardar payload JSON temporalmente en /tmp de la VPS
        sftp = ssh.open_sftp()
        with sftp.file("/tmp/flows_to_sync.json", "w") as rf:
            rf.write(payload)
        sftp.close()

        # Script node para ejecutar en el contenedor backend
        sync_script = """
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function run() {
  const data = JSON.parse(fs.readFileSync('/tmp/flows_to_sync.json', 'utf8'));
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No hay tenant en VPS');
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No hay usuario en VPS');

  console.log(`Sincronizando flujos para tenant: ${tenant.name} (${tenant.id})`);

  for (const f of data) {
    // 1. Upsert Flow
    const flow = await prisma.flow.upsert({
      where: { id: f.id },
      update: {
        name: f.name,
        description: f.description,
        triggerKeywords: f.triggerKeywords || [],
        isActive: f.isActive ?? true,
      },
      create: {
        id: f.id,
        tenantId: tenant.id,
        name: f.name,
        description: f.description,
        triggerKeywords: f.triggerKeywords || [],
        isActive: f.isActive ?? true,
        createdById: user.id,
      },
    });

    // 2. Sincronizar versiones
    for (const v of (f.versions || [])) {
      await prisma.flowVersion.upsert({
        where: { id: v.id },
        update: {
          versionNumber: v.versionNumber,
          status: v.status,
          definition: v.definition,
        },
        create: {
          id: v.id,
          flowId: flow.id,
          versionNumber: v.versionNumber,
          status: v.status,
          definition: v.definition,
        },
      });
    }

    // 3. Actualizar activeVersionId si corresponde
    if (f.activeVersionId) {
      await prisma.flow.update({
        where: { id: flow.id },
        data: { activeVersionId: f.activeVersionId },
      });
    }

    console.log(`  ✓ Flujo sincronizado: "${flow.name}"`);
  }
  console.log('Todos los flujos sincronizados exitosamente.');
}

run()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
"""
        sftp = ssh.open_sftp()
        with sftp.file("/tmp/sync_runner.js", "w") as rf:
            rf.write(sync_script)
        sftp.close()

        print("\n[3/3] Aplicando sincronización en la base de datos de producción...")
        cmd = (
            "docker cp /tmp/flows_to_sync.json wsflow-backend:/app/flows_to_sync.json && "
            "docker cp /tmp/sync_runner.js wsflow-backend:/app/sync_runner.js && "
            "docker exec -w /app wsflow-backend node /app/sync_runner.js && "
            "docker exec wsflow-backend rm -f /app/flows_to_sync.json /app/sync_runner.js && "
            "rm -f /tmp/flows_to_sync.json /tmp/sync_runner.js"
        )
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out:
            print(out)
        if err and "Error" in err:
            print("Avisos/Errores:", err)

        print("\n======================================================")
        print("  ¡Sincronización completada exitosamente!            ")
        print("  Verifica en: https://wsflow.hostlapaz.com           ")
        print("======================================================")

    finally:
        ssh.close()

if __name__ == "__main__":
    main()

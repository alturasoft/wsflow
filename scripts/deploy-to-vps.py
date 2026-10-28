import os
import sys
import io
import tarfile
import subprocess
import paramiko

# Asegurar codificación UTF-8 en consola de Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAR_PATH = os.path.join(PROJECT_ROOT, "wsflow_deploy.tar.gz")

HOSTNAME = "129.121.63.105"
PORT = 22022
USERNAME = "root"
PASSWORD = "vPS*#220669"

EXCLUDE_DIRS = {"node_modules", ".git", ".agents", "insumos", ".system_generated"}
EXCLUDE_EXTS = {".bat", ".ps1", ".log"}

def filter_tar(tarinfo):
    parts = tarinfo.name.replace("\\", "/").split("/")
    for part in parts:
        if part in EXCLUDE_DIRS:
            return None
    _, ext = os.path.splitext(tarinfo.name)
    if ext in EXCLUDE_EXTS:
        return None
    return tarinfo

def main():
    print("======================================================")
    print("      WSFlow - Despliegue Rápido a Producción         ")
    print("======================================================")

    # 1. Compilar backend localmente (rápido y sin agotar RAM en VPS)
    print("\n[1/4] Compilando Backend localmente (TypeScript -> JS)...")
    backend_dir = os.path.join(PROJECT_ROOT, "backend")
    res = subprocess.run(["npm.cmd", "run", "build"], cwd=backend_dir, capture_output=True, text=True)
    if res.returncode != 0:
        print("[ERROR] Falló la compilación del backend:")
        print(res.stderr or res.stdout)
        sys.exit(1)
    print("  ✓ Backend compilado en backend/dist.")

    # 2. Empaquetar proyecto optimizado
    print("\n[2/4] Empaquetando código fuente optimizado...")
    with tarfile.open(TAR_PATH, "w:gz") as tar:
        tar.add(os.path.join(PROJECT_ROOT, "backend"), arcname="backend", filter=filter_tar)
        tar.add(os.path.join(PROJECT_ROOT, "frontend"), arcname="frontend", filter=filter_tar)
        tar.add(os.path.join(PROJECT_ROOT, "docker-compose.prod.yml"), arcname="docker-compose.prod.yml")
    size_mb = os.path.getsize(TAR_PATH) / (1024 * 1024)
    print(f"  ✓ Archivo empaquetado ({size_mb:.2f} MB).")

    # 3. Subir a la VPS por SFTP
    print(f"\n[3/4] Subiendo a la VPS ({HOSTNAME}:{PORT})...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOSTNAME, port=PORT, username=USERNAME, password=PASSWORD, timeout=15)
    
    try:
        sftp = client.open_sftp()
        sftp.put(TAR_PATH, "/opt/wsflow/update.tar.gz")
        sftp.close()
        print("  ✓ Código transferido con éxito.")

        # 4. Desempaquetar y actualizar contenedores en la VPS
        print("\n[4/4] Actualizando y reiniciando contenedores en VPS...")
        remote_cmd = (
            "cd /opt/wsflow && "
            "tar -xzf update.tar.gz && "
            "rm update.tar.gz && "
            "docker compose -f docker-compose.prod.yml up -d --build"
        )
        stdin, stdout, stderr = client.exec_command(remote_cmd)
        while True:
            line = stdout.readline()
            if not line:
                break
            print("  " + line.strip())
            sys.stdout.flush()

        err = stderr.read().decode('utf-8', errors='replace')
        if err and "Error" in err:
            print("  Avisos:", err)

        print("\n======================================================")
        print("  ¡Despliegue finalizado exitosamente!               ")
        print("  Disponible en: https://wsflow.hostlapaz.com        ")
        print("======================================================")

    finally:
        client.close()
        if os.path.exists(TAR_PATH):
            os.remove(TAR_PATH)

if __name__ == "__main__":
    main()

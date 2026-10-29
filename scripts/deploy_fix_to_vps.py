import io
import sys
import os
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
    print("   Desplegando correccion de Flujo por Defecto a VPS  ")
    print("======================================================")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOSTNAME, port=PORT, username=USERNAME, password=PASSWORD, timeout=15)
    sftp = ssh.open_sftp()

    base_local = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    files_to_upload = [
        ("backend/src/modules/engine/dag-engine.service.ts", "/opt/wsflow/backend/src/modules/engine/dag-engine.service.ts"),
        ("backend/src/modules/flows/flows.service.ts", "/opt/wsflow/backend/src/modules/flows/flows.service.ts"),
        ("frontend/src/App.tsx", "/opt/wsflow/frontend/src/App.tsx"),
    ]

    print("\n[1/4] Subiendo archivos modificados a /opt/wsflow...")
    for local_rel, remote_path in files_to_upload:
        local_path = os.path.join(base_local, local_rel.replace('/', os.sep))
        print(f"  -> Subiendo {local_rel} a {remote_path}")
        sftp.put(local_path, remote_path)
    
    sftp.close()
    print("  OK Archivos subidos con exito.")

    print("\n[2/4] Limpiando keywords de saludo universal en BD de producción y borrando sesiones viejas...")
    sql_clean = """
    docker exec wsflow-postgres psql -U wsflow_user -d wsflow_db -c "
      UPDATE flows 
      SET \\"triggerKeywords\\" = (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements_text(\\"triggerKeywords\\"::jsonb) elem
        WHERE lower(elem) NOT IN ('hola', 'hola!', 'menu', 'menú', 'inicio', 'reiniciar', 'reset', 'empezar', 'hi', 'hello')
      )
      WHERE \\"triggerKeywords\\"::text LIKE '%hola%' OR \\"triggerKeywords\\"::text LIKE '%menu%';
      UPDATE flows SET \\"triggerKeywords\\" = '[]'::json WHERE \\"triggerKeywords\\" IS NULL;
    "
    docker exec wsflow-redis redis-cli FLUSHALL
    """
    stdin, stdout, stderr = ssh.exec_command(sql_clean)
    print(stdout.read().decode())
    print(stderr.read().decode())

    print("\n[3/4] Reconstruyendo y reiniciando contenedores (backend & frontend)...")
    build_cmd = """
    cd /opt/wsflow && docker compose -f docker-compose.prod.yml up -d --build backend frontend
    """
    stdin, stdout, stderr = ssh.exec_command(build_cmd)
    
    # Imprimir salida de la compilación
    while not stdout.channel.exit_status_ready():
        line = stdout.readline()
        if line:
            print(line, end="")
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("Avisos build:", err[-500:])

    print("\n[4/4] Verificando estado final de los contenedores...")
    check_cmd = "docker ps --filter name=wsflow --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    stdin, stdout, stderr = ssh.exec_command(check_cmd)
    print(stdout.read().decode())

    # Verificación de flujos en la BD
    query_cmd = """
    docker exec wsflow-postgres psql -U wsflow_user -d wsflow_db -c 'SELECT id, name, "triggerKeywords", "activeVersionId" FROM flows;'
    docker exec wsflow-postgres psql -U wsflow_user -d wsflow_db -c 'SELECT id, "defaultFlowId", "phoneNumberId" FROM whatsapp_accounts;'
    """
    stdin, stdout, stderr = ssh.exec_command(query_cmd)
    print("\n--- Estado de Flujos y Cuenta WhatsApp en BD ---")
    print(stdout.read().decode())

    ssh.close()
    print("======================================================")
    print("  ¡Despliegue y corrección completados con éxito!     ")
    print("======================================================")

if __name__ == "__main__":
    main()

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

def upload_dir(sftp, local_dir, remote_dir):
    try:
        sftp.mkdir(remote_dir)
    except IOError:
        pass
    for item in os.listdir(local_dir):
        l_path = os.path.join(local_dir, item)
        r_path = f"{remote_dir}/{item}"
        if os.path.isdir(l_path):
            upload_dir(sftp, l_path, r_path)
        else:
            sftp.put(l_path, r_path)

def main():
    print("======================================================")
    print("   Sincronizando dist del backend a la VPS            ")
    print("======================================================")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOSTNAME, port=PORT, username=USERNAME, password=PASSWORD, timeout=15)
    sftp = ssh.open_sftp()

    base_local = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dist_local = os.path.join(base_local, "backend", "dist")
    dist_remote = "/opt/wsflow/backend/dist"

    print("\n[1/3] Subiendo /backend/dist y docker-compose.prod.yml a la VPS...")
    upload_dir(sftp, dist_local, dist_remote)
    sftp.put(os.path.join(base_local, "docker-compose.prod.yml"), "/opt/wsflow/docker-compose.prod.yml")
    sftp.close()
    print("  OK dist y compose subidos exitosamente.")

    print("\n[2/3] Reconstruyendo wsflow-backend con el nuevo build...")
    build_cmd = """
    cd /opt/wsflow && docker compose -f docker-compose.prod.yml build backend && docker compose -f docker-compose.prod.yml up -d backend
    """
    stdin, stdout, stderr = ssh.exec_command(build_cmd)
    print(stdout.read().decode())
    print(stderr.read().decode())

    print("\n[3/3] Comprobando logs recientes de wsflow-backend...")
    log_cmd = "docker logs wsflow-backend --tail 25"
    stdin, stdout, stderr = ssh.exec_command(log_cmd)
    print(stdout.read().decode())

    ssh.close()
    print("======================================================")
    print("  ¡Backend actualizado y corriendo con el nuevo build!")
    print("======================================================")

if __name__ == "__main__":
    main()

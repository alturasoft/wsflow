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
    print("   Sincronizando frontend dist a la VPS              ")
    print("======================================================")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOSTNAME, port=PORT, username=USERNAME, password=PASSWORD, timeout=15)
    sftp = ssh.open_sftp()

    base_local = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dist_local = os.path.join(base_local, "frontend", "dist")
    dist_remote = "/tmp/frontend_dist"

    print("\n[1/3] Subiendo /frontend/dist a /tmp/frontend_dist...")
    upload_dir(sftp, dist_local, dist_remote)
    sftp.close()

    print("\n[2/3] Copiando al contenedor wsflow-frontend (/usr/share/nginx/html)...")
    cmd = """
    docker cp /tmp/frontend_dist/. wsflow-frontend:/usr/share/nginx/html/
    docker exec wsflow-frontend nginx -s reload
    rm -rf /tmp/frontend_dist
    """
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
    print(stderr.read().decode())

    print("[3/3] Listo. Frontend actualizado sin consumo de memoria.")
    ssh.close()

if __name__ == "__main__":
    main()

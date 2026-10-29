import paramiko
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

pattern = sys.argv[1] if len(sys.argv) > 1 else "rag_query"

cmd = f"docker logs wsflow-backend 2>&1 | grep -i -C 3 '{pattern}'"
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
ssh.close()


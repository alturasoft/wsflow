import io
import sys
import paramiko

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

cmd = "docker logs wsflow-backend --tail 30"
stdin, stdout, stderr = ssh.exec_command(cmd)
print("--- BACKEND LOGS ---")
print(stdout.read().decode('utf-8', errors='replace'))
ssh.close()

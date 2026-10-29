import paramiko
import json
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

cmd = """docker exec wsflow-backend wget -qO- --post-data='{"question":"Que tipos de seguros o servicios ofrecen a empresas y personas?","limit":5}' --header='Content-Type:application/json' http://localhost:3000/api/knowledge/query"""
stdin, stdout, stderr = ssh.exec_command(cmd)
raw = stdout.read().decode('utf-8', errors='replace')
parsed = json.loads(raw)
print("\n=== PREGUNTA: Que tipos de seguros o servicios ofrecen? ===")
print("ANSWER:\n", parsed.get("answer"))

ssh.close()

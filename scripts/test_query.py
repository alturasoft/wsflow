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

question = sys.argv[1] if len(sys.argv) > 1 else "¿Cuántos empleados tiene tu broker?"

payload = json.dumps({"question": question, "limit": 5}, ensure_ascii=False)
remote_cmd = f"docker exec -i wsflow-backend wget -qO- --post-data='{payload}' --header='Content-Type:application/json' http://localhost:3000/api/knowledge/query"

stdin, stdout, stderr = ssh.exec_command(remote_cmd)
raw = stdout.read().decode('utf-8', errors='replace')
try:
    parsed = json.loads(raw)
    print("\n=== PREGUNTA:", question)
    print("ANSWER:\n", parsed.get("answer"))
    print("\nTOTAL FOUND:", parsed.get("totalFound"))
    print("SOURCES:")
    for s in parsed.get("sources", []):
        print(f" - [{s.get('score')}] (Page {s.get('pageNumber')}): {s.get('content')[:150]}...")
except Exception as e:
    print("RAW OUTPUT:", raw)
    print("ERROR:", e)
    print("STDERR:", stderr.read().decode('utf-8', errors='replace'))

ssh.close()


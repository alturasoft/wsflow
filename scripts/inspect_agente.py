import paramiko
import json
import io
import sys

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

node_code = """
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const p = new PrismaClient();
p.flow.findFirst({
  where: { name: 'agente' },
  include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
}).then(f => {
  console.log(JSON.stringify(f.versions[0]?.definition, null, 2));
  return p.$disconnect();
}).catch(console.error);
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/inspect_agente.js', 'w') as f:
    f.write(node_code)
sftp.close()

ssh.exec_command("docker cp /tmp/inspect_agente.js wsflow-backend:/tmp/inspect_agente.js")
_, stdout, stderr = ssh.exec_command("docker exec wsflow-backend node /tmp/inspect_agente.js")
print(stdout.read().decode('utf-8', errors='replace'))
ssh.close()


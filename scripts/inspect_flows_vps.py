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
p.flow.findMany({
  include: { versions: true }
}).then(flows => {
  for (const f of flows) {
    console.log('=== FLOW:', f.name, 'Active:', f.isActive, '===');
    for (const v of f.versions) {
      console.log(' Version:', v.versionNumber, 'Status:', v.status);
      for (const n of (v.definition?.nodes || [])) {
        if (n.type === 'rag_query') {
          console.log('   * RAG NODE:', n.id, JSON.stringify(n.data || {}));
        }
      }
    }
  }
  return p.$disconnect();
}).catch(console.error);
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/inspect_flows.js', 'w') as f:
    f.write(node_code)
sftp.close()

ssh.exec_command("docker cp /tmp/inspect_flows.js wsflow-backend:/tmp/inspect_flows.js")
_, stdout, stderr = ssh.exec_command("docker exec wsflow-backend node /tmp/inspect_flows.js")
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))
ssh.close()

import paramiko
import io
import sys

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

code = """
const { QdrantClient } = require('/app/node_modules/@qdrant/js-client-rest');
const q = new QdrantClient({url:'http://qdrant:6333', checkCompatibility: false});
q.scroll('tenant_knowledge_bases', {
  filter: { must: [{ key: 'page_number', match: { value: 2 } }] },
  with_payload: true
}).then(r => {
  r.points.forEach(p => {
    console.log(`=== CHUNK ${p.payload.chunk_index} ===`);
    console.log(p.payload.content);
  });
}).catch(console.error);
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/print_page2.js', 'w') as f:
    f.write(code)
sftp.close()

ssh.exec_command("docker cp /tmp/print_page2.js wsflow-backend:/tmp/print_page2.js")
_, out, err = ssh.exec_command("docker exec wsflow-backend node /tmp/print_page2.js")
print(out.read().decode('utf-8', errors='replace'))
ssh.close()


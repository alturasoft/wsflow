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
const c = new QdrantClient({ url: 'http://qdrant:6333', checkCompatibility: false });
c.scroll('tenant_knowledge_bases', { limit: 1, with_vector: true }).then(r => {
  const p = r.points[0];
  console.log('Point ID:', p?.id);
  console.log('Vec length:', p?.vector?.length);
  console.log('Sample vector:', p?.vector?.slice(0, 10));
  // Check if non-zero count
  const nonZeros = (p?.vector || []).filter(x => Math.abs(x) > 0.00001).length;
  console.log('Non-zero elements in 768 dims:', nonZeros);
}).catch(console.error);
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/check_vec.js', 'w') as f:
    f.write(code)
sftp.close()

ssh.exec_command("docker cp /tmp/check_vec.js wsflow-backend:/tmp/check_vec.js")
_, out, err = ssh.exec_command("docker exec wsflow-backend node /tmp/check_vec.js")
print(out.read().decode('utf-8', errors='replace'))
print(err.read().decode('utf-8', errors='replace'))
ssh.close()


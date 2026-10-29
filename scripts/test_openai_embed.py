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
const axios = require('/app/node_modules/axios');
async function test() {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('Testing OpenAI Embedding with key:', apiKey ? apiKey.slice(0, 10) + '...' : 'NONE');
  try {
    const res = await axios.post('https://api.openai.com/v1/embeddings', {
      model: 'text-embedding-3-small',
      input: '¿Cuántos empleados tiene tu broker?',
      dimensions: 768,
    }, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log('OpenAI Embedding success! Dims:', res.data?.data?.[0]?.embedding?.length);
    console.log('First 5 values:', res.data?.data?.[0]?.embedding?.slice(0, 5));
  } catch (err) {
    console.error('OpenAI Embedding Error:', err.message, err.response?.data);
  }
}
test();
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/test_openai.js', 'w') as f:
    f.write(code)
sftp.close()

ssh.exec_command("docker cp /tmp/test_openai.js wsflow-backend:/tmp/test_openai.js")
_, out, err = ssh.exec_command("docker exec wsflow-backend node /tmp/test_openai.js")
print(out.read().decode('utf-8', errors='replace'))
print(err.read().decode('utf-8', errors='replace'))
ssh.close()


import paramiko
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

# Generar un synthetic vector en node dentro del backend para la pregunta
test_cmd = """docker exec wsflow-backend node -e '
const { QdrantClient } = require("@qdrant/js-client-rest");

function generateSyntheticEmbedding(text, dimensions) {
  const vector = new Array(dimensions).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = (charCode * 31 + i) % dimensions;
    vector[index] = (vector[index] + (charCode % 10)) / 10;
  }
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((v) => v / norm);
}

async function run() {
  const client = new QdrantClient({ url: "http://qdrant:6333" });
  const qVec = generateSyntheticEmbedding("que es TuBroker Sudamericana...?", 768);
  
  // Buscar sin score_threshold
  const res = await client.query("tenant_knowledge_bases", {
    query: qVec,
    filter: {
      must: [{ key: "tenant_id", match: { value: "fb6be296-d798-406d-9732-bb937f8bf0fd" } }]
    },
    limit: 5,
    with_payload: true
  });
  
  console.log("Found points:", res.points?.length);
  for (const p of (res.points || [])) {
    console.log("Score:", p.score, "Chunk:", p.payload?.chunk_index, p.payload?.content?.slice(0, 100));
  }
}
run().catch(console.error);
'"""

stdin, stdout, stderr = ssh.exec_command(test_cmd)
print("=== RESULTADO BÚSQUEDA SIN SCORE THRESHOLD ===")
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

ssh.close()

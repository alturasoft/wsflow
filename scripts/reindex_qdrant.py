import paramiko
import io
import sys

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

reindex_code = """
const { QdrantClient } = require('/app/node_modules/@qdrant/js-client-rest');
const axios = require('/app/node_modules/axios');

const qdrant = new QdrantClient({ url: 'http://qdrant:6333', checkCompatibility: false });
const collectionName = 'tenant_knowledge_bases';
const apiKey = process.env.OPENAI_API_KEY;

async function getOpenAiEmbeddingsBatch(texts) {
  const url = 'https://api.openai.com/v1/embeddings';
  const res = await axios.post(url, {
    model: 'text-embedding-3-small',
    input: texts,
    dimensions: 768
  }, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: 20000
  });
  return res.data.data.map(d => d.embedding);
}

async function run() {
  console.log('Obteniendo puntos existentes en Qdrant...');
  const scrollRes = await qdrant.scroll(collectionName, { limit: 100, with_payload: true, with_vector: false });
  const points = scrollRes.points || [];
  console.log(`Total puntos a re-vectorizar con OpenAI: ${points.length}`);

  if (points.length === 0) {
    console.log('No hay puntos en Qdrant.');
    return;
  }

  const texts = points.map(p => p.payload.content);
  console.log('Generando embeddings densos con OpenAI text-embedding-3-small (768 dims)...');
  const embeddings = await getOpenAiEmbeddingsBatch(texts);

  console.log('Re-insertando puntos vectorizados en Qdrant...');
  const updatedPoints = points.map((p, idx) => ({
    id: p.id,
    vector: embeddings[idx],
    payload: p.payload
  }));

  await qdrant.upsert(collectionName, {
    wait: true,
    points: updatedPoints
  });

  console.log('✓ Re-indexación vectorial completada con éxito.');

  // Prueba de búsqueda semántica con pregunta de prueba
  console.log('\\nProbando búsqueda semántica para: "¿Qué tipos de seguro de salud ofrecen?"');
  const [qVec] = await getOpenAiEmbeddingsBatch(['¿Qué tipos de seguro de salud ofrecen?']);
  const searchRes = await qdrant.query(collectionName, {
    query: qVec,
    limit: 3,
    with_payload: true
  });

  for (const hit of searchRes.points) {
    console.log(` - Score: ${hit.score.toFixed(4)} | Pág ${hit.payload.page_number}: ${hit.payload.content.slice(0, 90)}...`);
  }

  // Prueba para pregunta fuera de dominio: "¿Cuántos empleados tiene tu broker?"
  console.log('\\nProbando búsqueda semántica para pregunta fuera de alcance: "¿Cuántos empleados tiene tu broker?"');
  const [qVec2] = await getOpenAiEmbeddingsBatch(['¿Cuántos empleados tiene tu broker?']);
  const searchRes2 = await qdrant.query(collectionName, {
    query: qVec2,
    limit: 3,
    with_payload: true
  });
  for (const hit of searchRes2.points) {
    console.log(` - Score: ${hit.score.toFixed(4)} | Pág ${hit.payload.page_number}: ${hit.payload.content.slice(0, 90)}...`);
  }
}

run().catch(console.error);
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/reindex_qdrant.js', 'w') as f:
    f.write(reindex_code)
sftp.close()

ssh.exec_command("docker cp /tmp/reindex_qdrant.js wsflow-backend:/tmp/reindex_qdrant.js")
_, out, err = ssh.exec_command("docker exec wsflow-backend node /tmp/reindex_qdrant.js")
print(out.read().decode('utf-8', errors='replace'))
print(err.read().decode('utf-8', errors='replace'))
ssh.close()


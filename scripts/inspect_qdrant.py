import paramiko
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

# 1. Consultar colecciones e información de puntos
cmd = "docker exec wsflow-backend wget -qO- http://qdrant:6333/collections/tenant_knowledge_bases"
stdin, stdout, stderr = ssh.exec_command(cmd)
info = stdout.read().decode('utf-8', errors='replace')
print("=== INFO COLECCIÓN QDRANT ===")
print(info)

# 2. Consultar registros en PostgreSQL
cmd2 = "docker exec wsflow-postgres psql -U wsflow_user -d wsflow_db -c 'SELECT id, title, \"pageCount\", \"chunkCount\", status FROM knowledge_documents;'"
stdin, stdout, stderr = ssh.exec_command(cmd2)
docs = stdout.read().decode('utf-8', errors='replace')
print("\n=== DOCUMENTOS EN POSTGRESQL ===")
print(docs)

# 3. Scroll de puntos con payload
cmd3 = """docker exec wsflow-backend wget -qO- --post-data='{"limit":2,"with_payload":true}' --header='Content-Type:application/json' http://qdrant:6333/collections/tenant_knowledge_bases/points/scroll"""
stdin, stdout, stderr = ssh.exec_command(cmd3)
points = stdout.read().decode('utf-8', errors='replace')
print("\n=== FRAGMENTOS EN QDRANT (SCROLL) ===")
try:
    p_json = json.loads(points)
    for p in p_json.get('result', {}).get('points', []):
        payload = p.get('payload', {})
        print(f"\n[Punto ID: {p.get('id')}] - Pagina {payload.get('page_number')}, Chunk {payload.get('chunk_index')}")
        print(f"Tenant ID: {payload.get('tenant_id')}")
        print(f"Título: {payload.get('title')}")
        print(f"Texto: {payload.get('content')[:200]}...")
except Exception as e:
    print(points[:400])

# 4. Probar query directa en Qdrant sin score_threshold
cmd4 = """docker exec wsflow-backend wget -qO- --post-data='{"limit":3,"with_payload":true}' --header='Content-Type:application/json' http://qdrant:6333/collections/tenant_knowledge_bases/points/query"""
stdin, stdout, stderr = ssh.exec_command(cmd4)
print("\n=== TEST QUERY DIRECTA ===")
print(stdout.read().decode('utf-8', errors='replace')[:400])

ssh.close()

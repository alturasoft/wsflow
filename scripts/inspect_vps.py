import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

cmd = """
docker exec wsflow-postgres psql -U wsflow_user -d wsflow_db -c 'SELECT id, name, "triggerKeywords", "activeVersionId" FROM flows;'
docker exec wsflow-postgres psql -U wsflow_user -d wsflow_db -c 'SELECT id, "defaultFlowId", "phoneNumberId" FROM whatsapp_accounts;'
docker exec wsflow-postgres psql -U wsflow_user -d wsflow_db -c 'SELECT id, "flowId", "versionNumber", status FROM flow_versions;'
"""
stdin, stdout, stderr = ssh.exec_command(cmd)
print("--- STDOUT ---")
print(stdout.read().decode('utf-8', errors='replace'))
print("--- STDERR ---")
print(stderr.read().decode('utf-8', errors='replace'))
ssh.close()

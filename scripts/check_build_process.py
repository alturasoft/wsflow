import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

_, stdout, _ = ssh.exec_command("ps aux | grep -i 'docker compose' | grep -v grep")
print("Docker processes:\n", stdout.read().decode('utf-8'))

_, stdout, _ = ssh.exec_command("docker logs wsflow-backend --tail 10")
print("Recent logs:\n", stdout.read().decode('utf-8'))

ssh.close()


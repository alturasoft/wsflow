import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

cmd = 'docker inspect wsflow-backend --format "{{json .Config.WorkingDir}} {{json .Mounts}}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("WorkingDir & Mounts:")
print(stdout.read().decode())

cmd2 = 'find / -maxdepth 3 -name "*wsflow*" 2>/dev/null'
stdin, stdout, stderr = ssh.exec_command(cmd2)
print("Find wsflow directories:")
print(stdout.read().decode())

ssh.close()

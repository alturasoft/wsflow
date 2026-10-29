import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

cmd = 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode())

cmd2 = 'ls -la /root && ls -la /root/wsflow'
stdin, stdout, stderr = ssh.exec_command(cmd2)
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()

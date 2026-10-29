import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.63.105', port=22022, username='root', password='vPS*#220669')

cmd = 'ls -la /opt/wsflow'
stdin, stdout, stderr = ssh.exec_command(cmd)
print("ls /opt/wsflow:")
print(stdout.read().decode())

ssh.close()

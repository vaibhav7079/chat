import socket
from Crypto.Cipher import AES

secret_key = b'mysecretpassword123'

def decrypt_message(encrypted_message):
    cipher = AES.new(secret_key, AES.MODE_EAX, nonce=encrypted_message[:16])
    return cipher.decrypt(encrypted_message[16:]).decode()

server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_socket.bind(('0.0.0.0', 12345))
server_socket.listen(1)

print("Server is running and waiting for connections...")

conn, addr = server_socket.accept()
print(f"Connection from: {addr}")

user_id = conn.recv(1024).decode()
print(f"Received user ID: {user_id}")

encrypted_message = conn.recv(1024)
decrypted_message = decrypt_message(encrypted_message)

print(f"Message for user {user_id}: {decrypted_message}")

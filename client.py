from Crypto.Cipher import AES
import socket

secret_key = b'mysecretpassword123'

def encrypt_message(message):
    cipher = AES.new(secret_key, AES.MODE_EAX)
    nonce = cipher.nonce
    ciphertext, tag = cipher.encrypt_and_digest(message.encode())
    return nonce + ciphertext

client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client_socket.connect(('server-ip-address', 12345))

user_id = "friend123"
client_socket.send(user_id.encode())

message = "यह एक एन्क्रिप्टेड मैसेज है!"
encrypted_message = encrypt_message(message)

client_socket.send(encrypted_message)
client_socket.close()

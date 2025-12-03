import socket
import threading
from Crypto.Cipher import AES

secret_key = b'ThisIsASecretKey'

def decrypt_message(encrypted_message):
    try:
        cipher = AES.new(secret_key, AES.MODE_EAX, nonce=encrypted_message[:16])
        return cipher.decrypt(encrypted_message[16:]).decode()
    except Exception as e:
        return f"Error decrypting message: {e}"

def encrypt_message(message):
    cipher = AES.new(secret_key, AES.MODE_EAX)
    nonce = cipher.nonce
    ciphertext, tag = cipher.encrypt_and_digest(message.encode())
    return nonce + ciphertext

def receive_messages(conn):
    while True:
        try:
            encrypted_message = conn.recv(1024)
            if not encrypted_message:
                print("\nClient disconnected.")
                break
            decrypted_message = decrypt_message(encrypted_message)
            print(f"\nClient: {decrypted_message}")
        except ConnectionResetError:
            print("\nConnection lost.")
            break
        except Exception as e:
            print(f"\nError receiving message: {e}")
            break

server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_socket.bind(('0.0.0.0', 12345))
server_socket.listen(1)

print("Server is running and waiting for connections...")

conn, addr = server_socket.accept()
print(f"Connection from: {addr}")

# Start a thread to listen for incoming messages
receive_thread = threading.Thread(target=receive_messages, args=(conn,))
receive_thread.daemon = True
receive_thread.start()

print("Chat started! Type your messages below.")

while True:
    try:
        message = input()
        if message.lower() == 'exit':
            break
        encrypted_message = encrypt_message(message)
        conn.send(encrypted_message)
    except KeyboardInterrupt:
        break
    except Exception as e:
        print(f"Error sending message: {e}")
        break

conn.close()
server_socket.close()

from Crypto.Cipher import AES
import socket
import threading

secret_key = b'ThisIsASecretKey'

def encrypt_message(message):
    cipher = AES.new(secret_key, AES.MODE_EAX)
    nonce = cipher.nonce
    ciphertext, tag = cipher.encrypt_and_digest(message.encode())
    return nonce + ciphertext

def decrypt_message(encrypted_message):
    try:
        cipher = AES.new(secret_key, AES.MODE_EAX, nonce=encrypted_message[:16])
        return cipher.decrypt(encrypted_message[16:]).decode()
    except Exception as e:
        return f"Error decrypting message: {e}"

def receive_messages(client_socket):
    while True:
        try:
            encrypted_message = client_socket.recv(1024)
            if not encrypted_message:
                print("\nServer disconnected.")
                break
            decrypted_message = decrypt_message(encrypted_message)
            print(f"\nServer: {decrypted_message}")
        except ConnectionResetError:
            print("\nConnection lost.")
            break
        except Exception as e:
            print(f"\nError receiving message: {e}")
            break

client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
# Connect to localhost for testing
client_socket.connect(('127.0.0.1', 12345))

print("Connected to server! Type your messages below.")

# Start a thread to listen for incoming messages
receive_thread = threading.Thread(target=receive_messages, args=(client_socket,))
receive_thread.daemon = True
receive_thread.start()

while True:
    try:
        message = input()
        if message.lower() == 'exit':
            break
        encrypted_message = encrypt_message(message)
        client_socket.send(encrypted_message)
    except KeyboardInterrupt:
        break
    except Exception as e:
        print(f"Error sending message: {e}")
        break

client_socket.close()

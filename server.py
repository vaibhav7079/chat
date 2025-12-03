import socket
import threading
from Crypto.Cipher import AES

secret_key = b'ThisIsASecretKey'

# List to keep track of connected clients: (socket, address, username)
clients = []

def decrypt_message(encrypted_message):
    try:
        cipher = AES.new(secret_key, AES.MODE_EAX, nonce=encrypted_message[:16])
        return cipher.decrypt(encrypted_message[16:]).decode()
    except Exception as e:
        return None

def encrypt_message(message):
    cipher = AES.new(secret_key, AES.MODE_EAX)
    nonce = cipher.nonce
    ciphertext, tag = cipher.encrypt_and_digest(message.encode())
    return nonce + ciphertext

def broadcast(message, sender_conn=None):
    """Sends a message to all clients except the sender."""
    encrypted_message = encrypt_message(message)
    for client in clients:
        client_conn, _, _ = client
        if client_conn != sender_conn:
            try:
                client_conn.send(encrypted_message)
            except:
                # If sending fails, assume client is dead and remove them later
                pass

def handle_client(conn, addr):
    print(f"New connection from {addr}")
    
    # First message is expected to be the username
    try:
        encrypted_username = conn.recv(1024)
        username = decrypt_message(encrypted_username)
        if not username:
            username = f"User-{addr[1]}"
    except:
        username = f"User-{addr[1]}"

    clients.append((conn, addr, username))
    print(f"{username} joined the chat.")
    broadcast(f"{username} has joined the chat!", conn)

    while True:
        try:
            encrypted_message = conn.recv(1024)
            if not encrypted_message:
                break
            
            message_content = decrypt_message(encrypted_message)
            if message_content:
                print(f"{username}: {message_content}")
                # Broadcast: "Username: Message"
                broadcast(f"{username}: {message_content}", conn)
            
        except Exception as e:
            print(f"Error handling client {username}: {e}")
            break

    # Cleanup
    print(f"{username} disconnected.")
    clients.remove((conn, addr, username))
    broadcast(f"{username} has left the chat.", conn)
    conn.close()

server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_socket.bind(('0.0.0.0', 12345))
server_socket.listen(5) # Allow up to 5 queued connections

print("Chat Server is running...")

while True:
    conn, addr = server_socket.accept()
    thread = threading.Thread(target=handle_client, args=(conn, addr))
    thread.daemon = True
    thread.start()

# FastAPI Chat Application

A real-time chat application built with **FastAPI** and **WebSockets**. It supports multiple clients chatting in a shared room.

## Features
- Real-time bidirectional communication.
- Lightweight and fast (using FastAPI).
- Multi-client support (Chat Room).
- Easy to deploy.

---

## 1. Local Setup (Testing on your PC)

### Prerequisites
- Python 3.7+ installed.

### Installation
1.  Clone or download this repository.
2.  Install the required libraries:
    ```bash
    pip install -r requirements.txt
    ```

### Running the Server
Start the chat server locally:
```bash
uvicorn server_api:app --host 0.0.0.0 --port 8000 --reload
```
You will see: `Uvicorn running on http://0.0.0.0:8000`

### Running the Client
Open a new terminal (or multiple for multiple users) and run:
```bash
python client_api.py
```
- **Server IP**: Press Enter (defaults to `127.0.0.1`).
- **Username**: Enter your name (e.g., Alice).

---

## 2. Online Deployment (Cloud Server)

To chat with friends over the internet, you need to host the server on a Cloud VPS (Virtual Private Server) like **AWS EC2**, **DigitalOcean**, **Linode**, or **Google Cloud**.

### Step 1: Get a Server
1.  Sign up for a cloud provider (e.g., AWS Free Tier).
2.  Create a new **Ubuntu** instance (server).
3.  Make sure to **Allow Traffic on Port 8000** in the server's Firewall / Security Group settings.

### Step 2: Prepare the Server
Connect to your server via SSH:
```bash
ssh root@your-server-ip
```

Update the system and install Python/Pip:
```bash
sudo apt update
sudo apt install python3 python3-pip -y
```

### Step 3: Upload Code
You can use `scp` to upload files from your computer to the server:
```bash
scp requirements.txt server_api.py root@your-server-ip:~/
```
*Or just create the files on the server using a text editor like `nano`.*

### Step 4: Run the Server
On the cloud server, install dependencies:
```bash
pip3 install -r requirements.txt
```

Start the server in the background (so it keeps running after you disconnect):
```bash
nohup uvicorn server_api:app --host 0.0.0.0 --port 8000 &
```

### Step 5: Connect from Anywhere
Now your friends can connect from their own computers!

1.  Send them the `client_api.py` file (and `requirements.txt`).
2.  They install dependencies: `pip install -r requirements.txt`.
3.  They run the client: `python client_api.py`.
4.  **Important**: When asked for **Server IP**, they must enter your Cloud Server's **Public IP Address** (e.g., `203.0.113.45`).

---

## Troubleshooting
- **Connection Refused**: Check if the server is running and if Port 8000 is open in the firewall.
- **Module Not Found**: Make sure you ran `pip install -r requirements.txt`.
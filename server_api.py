from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from typing import List
import os

app = FastAPI()

# Mount the static directory
script_dir = os.path.dirname(__file__)
static_dir = os.path.join(script_dir, "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def get():
    with open(os.path.join(static_dir, "index.html")) as f:
        return HTMLResponse(content=f.read(), status_code=200)

import json
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        # Store active connections as {websocket: username}
        self.active_connections: dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, username: str):
        # await websocket.accept()  <-- Removed, handled in endpoint
        self.active_connections[websocket] = username
        await self.broadcast_user_list()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]

    async def broadcast(self, message: str, sender: str = "System", recipient: str = None):
        timestamp = datetime.now().strftime("%H:%M")
        data = json.dumps({
            "type": "message",
            "content": message,
            "sender": sender,
            "timestamp": timestamp,
            "recipient": recipient
        })

        if recipient and recipient != "General":
            # Private message logic
            target_found = False
            for connection, user in self.active_connections.items():
                if user == recipient or user == sender:
                    try:
                        await connection.send_text(data)
                        if user == recipient:
                            target_found = True
                    except:
                        pass
            # Optional: Notify sender if recipient not found?
        else:
            # Broadcast to all
            for connection in self.active_connections:
                try:
                    await connection.send_text(data)
                except:
                    pass

    async def broadcast_user_list(self):
        users = list(self.active_connections.values())
        data = json.dumps({
            "type": "user_list",
            "users": users
        })
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except:
                pass

manager = ConnectionManager()

CHAT_PASSWORD = "home@108"

@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str, token: str = None):
    await websocket.accept()
    if token != CHAT_PASSWORD:
        await websocket.close(code=4003)
        return

    if username in manager.active_connections.values():
        await websocket.close(code=4009)
        return

    await manager.connect(websocket, username)
    try:
        await manager.broadcast(f"{username} joined the chat!", sender="System")
        while True:
            data_str = await websocket.receive_text()
            try:
                data_json = json.loads(data_str)
                content = data_json.get("content")
                recipient = data_json.get("recipient")
            except json.JSONDecodeError:
                content = data_str
                recipient = None
            
            await manager.broadcast(content, sender=username, recipient=recipient)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"{username} left the chat.", sender="System")
        await manager.broadcast_user_list()

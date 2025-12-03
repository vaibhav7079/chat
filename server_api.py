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
        await websocket.accept()
        self.active_connections[websocket] = username
        await self.broadcast_user_list()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]

    async def broadcast(self, message: str, sender: str = "System"):
        timestamp = datetime.now().strftime("%H:%M")
        data = json.dumps({
            "type": "message",
            "content": message,
            "sender": sender,
            "timestamp": timestamp
        })
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

@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    await manager.connect(websocket, username)
    try:
        await manager.broadcast(f"{username} joined the chat!", sender="System")
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, sender=username)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"{username} left the chat.", sender="System")
        await manager.broadcast_user_list()

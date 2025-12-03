import asyncio
import websockets
import threading

async def receive_messages(websocket):
    try:
        while True:
            message = await websocket.recv()
            print(f"\n{message}")
    except websockets.exceptions.ConnectionClosed:
        print("\nConnection closed.")

async def send_messages(websocket):
    loop = asyncio.get_event_loop()
    while True:
        try:
            # Run input in a separate thread to avoid blocking the asyncio loop
            message = await loop.run_in_executor(None, input)
            if message.lower() == 'exit':
                break
            await websocket.send(message)
        except:
            break

async def start_client():
    server_ip = input("Enter Server IP (press Enter for localhost): ").strip() or "127.0.0.1"
    username = input("Enter your Username: ").strip() or "Guest"
    
    uri = f"ws://{server_ip}:8000/ws/{username}"
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri} as {username}!")
            
            # Run receive and send tasks concurrently
            receive_task = asyncio.create_task(receive_messages(websocket))
            send_task = asyncio.create_task(send_messages(websocket))
            
            done, pending = await asyncio.wait(
                [receive_task, send_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            
            for task in pending:
                task.cancel()
                
    except Exception as e:
        print(f"Could not connect: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(start_client())
    except KeyboardInterrupt:
        print("\nExiting...")

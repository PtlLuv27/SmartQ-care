# backend/app/websocket.py
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Dictionary storing a list of active websockets per doctor_id
        # Format: { doctor_id: [WebSocket, WebSocket, ...] }
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, doctor_id: int):
        await websocket.accept()
        if doctor_id not in self.active_connections:
            self.active_connections[doctor_id] = []
        self.active_connections[doctor_id].append(websocket)

    def disconnect(self, websocket: WebSocket, doctor_id: int):
        if doctor_id in self.active_connections:
            self.active_connections[doctor_id].remove(websocket)
            # Cleanup empty lists to save memory
            if not self.active_connections[doctor_id]:
                del self.active_connections[doctor_id]

    async def broadcast_queue_update(self, doctor_id: int, message: dict):
        """Sends a JSON payload to every patient watching this specific doctor's queue."""
        if doctor_id in self.active_connections:
            for connection in self.active_connections[doctor_id]:
                await connection.send_json(message)

# Initialize a global instance of the manager
manager = ConnectionManager()
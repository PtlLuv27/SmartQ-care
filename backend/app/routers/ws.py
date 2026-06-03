# backend/app/routers/ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket import manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/queue/{doctor_id}")
async def websocket_queue_endpoint(websocket: WebSocket, doctor_id: int):
    await manager.connect(websocket, doctor_id)
    try:
        while True:
            await websocket.receive_text() 
    except WebSocketDisconnect:
        manager.disconnect(websocket, doctor_id)
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
import json
import asyncio
from app.api.deps import get_tenant_db_dependency, get_current_tenant_id
from app.models import Response, Contact
from app.schemas import DashboardStats

router = APIRouter()

# Simple Connection Manager for WebSockets
class ConnectionManager:
    def __init__(self):
        # dict mapping tenant_id -> campaign_id -> list of websockets
        self.active_connections: Dict[str, Dict[str, List[WebSocket]]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str, campaign_id: str):
        await websocket.accept()
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = {}
        if campaign_id not in self.active_connections[tenant_id]:
            self.active_connections[tenant_id][campaign_id] = []
        self.active_connections[tenant_id][campaign_id].append(websocket)

    def disconnect(self, websocket: WebSocket, tenant_id: str, campaign_id: str):
        self.active_connections[tenant_id][campaign_id].remove(websocket)

    async def broadcast(self, message: str, tenant_id: str, campaign_id: str):
        if tenant_id in self.active_connections and campaign_id in self.active_connections[tenant_id]:
            for connection in self.active_connections[tenant_id][campaign_id]:
                await connection.send_text(message)

manager = ConnectionManager()

def notify_dashboard(tenant_id: str, campaign_id: str):
    # This will be called from survey.py
    # Since survey is synchronous and websocket is async, we can use an event loop or background task.
    # A robust solution uses Redis pub/sub. For simplicity, we just use a small hack here if in same process.
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(manager.broadcast(json.dumps({"event": "new_response"}), tenant_id, campaign_id))
    except RuntimeError:
        pass # In real-world, we need a better async bridge

@router.get("/{campaign_id}", response_model=DashboardStats)
def get_dashboard_stats(campaign_id: str, db: Session = Depends(get_tenant_db_dependency)):
    total_enviados = db.query(Contact).filter(Contact.estado.in_(["enviado", "respondido"])).count()
    total_respondidos = db.query(Contact).filter(Contact.estado == "respondido").count()
    
    responses = db.query(Response).filter(Response.campaign_id == campaign_id).all()
    
    distribucion_estrellas = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    promotores = 0
    detractores = 0
    suma_total = 0
    total_preguntas_respondidas = 0
    
    for r in responses:
        for p in [r.pregunta_1, r.pregunta_2, r.pregunta_3, r.pregunta_4, r.pregunta_5]:
            if p:
                distribucion_estrellas[p] += 1
                suma_total += p
                total_preguntas_respondidas += 1
                if p >= 4: promotores += 1
                elif p <= 2: detractores += 1

    tasa_respuesta = (total_respondidos / total_enviados * 100) if total_enviados > 0 else 0
    promedio_general = (suma_total / total_preguntas_respondidas) if total_preguntas_respondidas > 0 else 0
    
    nps = ((promotores - detractores) / total_preguntas_respondidas * 100) if total_preguntas_respondidas > 0 else 0

    return {
        "total_enviados": total_enviados,
        "total_respondidos": total_respondidos,
        "tasa_respuesta": round(tasa_respuesta, 2),
        "promedio_general": round(promedio_general, 2),
        "distribucion_estrellas": distribucion_estrellas,
        "nps": round(nps, 2)
    }

@router.get("/{campaign_id}/latest")
def get_latest_responses(campaign_id: str, db: Session = Depends(get_tenant_db_dependency)):
    responses = db.query(Response, Contact).join(Contact, Response.contact_id == Contact.id)\
        .filter(Response.campaign_id == campaign_id)\
        .order_by(Response.created_at.desc()).limit(20).all()
        
    result = []
    for r, c in responses:
        avg = (r.pregunta_1 + r.pregunta_2 + r.pregunta_3 + r.pregunta_4 + r.pregunta_5) / 5
        result.append({
            "nombre": f"{c.nombre} {c.apellido}",
            "promedio": round(avg, 1),
            "hora": r.created_at.isoformat()
        })
    return result

@router.websocket("/ws/{tenant_id}/{campaign_id}")
async def websocket_endpoint(websocket: WebSocket, tenant_id: str, campaign_id: str):
    await manager.connect(websocket, tenant_id, campaign_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, tenant_id, campaign_id)

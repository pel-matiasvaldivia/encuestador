from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import csv
import io
from app.api.deps import get_tenant_db_dependency, get_current_tenant_id
from app.models import Campaign, Contact, Response
from app.schemas import CampaignCreate, CampaignResponse
from app.tasks.celery_worker import send_survey
from app.core.config import settings

router = APIRouter()

class CampaignUpdate(BaseModel):
    nombre: str
    canal: str

# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("/", response_model=CampaignResponse)
def create_campaign(campaign_in: CampaignCreate, db: Session = Depends(get_tenant_db_dependency)):
    campaign = Campaign(nombre=campaign_in.nombre, canal=campaign_in.canal)
    db.add(campaign)
    db.commit()
    return campaign

@router.get("/", response_model=List[CampaignResponse])
def get_campaigns(db: Session = Depends(get_tenant_db_dependency)):
    return db.query(Campaign).order_by(Campaign.fecha_inicio.desc()).all()

@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(campaign_id: str, body: CampaignUpdate, db: Session = Depends(get_tenant_db_dependency)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    campaign.nombre = body.nombre
    campaign.canal = body.canal
    db.commit()
    return campaign

@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: str, db: Session = Depends(get_tenant_db_dependency)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    db.query(Response).filter(Response.campaign_id == campaign_id).delete()
    db.delete(campaign)
    db.commit()
    return {"message": "Campaña eliminada"}

# ── LIFECYCLE ─────────────────────────────────────────────────────────────────

@router.post("/{campaign_id}/launch")
def launch_campaign(campaign_id: str, db: Session = Depends(get_tenant_db_dependency), tenant_id: str = Depends(get_current_tenant_id)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    contacts = db.query(Contact).filter(Contact.estado == "pendiente").all()
    for contact in contacts:
        survey_url = f"{settings.DOMAIN}/s/{contact.id}?c={campaign.id}"
        send_survey.delay(str(contact.id), contact.contacto, survey_url, campaign.canal, tenant_id)
        contact.estado = "enviado"
    campaign.estado = "en_curso"
    db.commit()
    return {"message": f"Campaña lanzada. {len(contacts)} mensajes encolados."}

@router.post("/{campaign_id}/pause")
def pause_campaign(campaign_id: str, db: Session = Depends(get_tenant_db_dependency)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign or campaign.estado != "en_curso":
        raise HTTPException(status_code=400, detail="Solo se puede pausar una campaña en curso")
    campaign.estado = "pausada"
    db.commit()
    return {"message": "Campaña pausada"}

@router.post("/{campaign_id}/resume")
def resume_campaign(campaign_id: str, db: Session = Depends(get_tenant_db_dependency)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign or campaign.estado != "pausada":
        raise HTTPException(status_code=400, detail="Solo se puede reanudar una campaña pausada")
    campaign.estado = "en_curso"
    db.commit()
    return {"message": "Campaña reanudada"}

@router.post("/{campaign_id}/finish")
def finish_campaign(campaign_id: str, db: Session = Depends(get_tenant_db_dependency)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign or campaign.estado not in ("en_curso", "pausada"):
        raise HTTPException(status_code=400, detail="La campaña no puede finalizarse en su estado actual")
    campaign.estado = "finalizada"
    db.commit()
    return {"message": "Campaña finalizada"}

# ── REPORT ────────────────────────────────────────────────────────────────────

@router.get("/{campaign_id}/report")
def download_report(campaign_id: str, db: Session = Depends(get_tenant_db_dependency)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    rows = (
        db.query(Response, Contact)
        .join(Contact, Response.contact_id == Contact.id)
        .filter(Response.campaign_id == campaign_id)
        .order_by(Response.created_at.asc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Nombre", "Apellido", "Empresa", "CUIT", "Sector",
        "Pregunta 1", "Pregunta 2", "Pregunta 3", "Pregunta 4", "Pregunta 5",
        "Promedio", "Fecha"
    ])
    for r, c in rows:
        scores = [r.pregunta_1, r.pregunta_2, r.pregunta_3, r.pregunta_4, r.pregunta_5]
        valid = [s for s in scores if s]
        promedio = round(sum(valid) / len(valid), 2) if valid else ""
        writer.writerow([
            c.nombre, c.apellido, c.razon_social or "", c.cuit or "", c.sector or "",
            r.pregunta_1, r.pregunta_2, r.pregunta_3, r.pregunta_4, r.pregunta_5,
            promedio, r.created_at.strftime("%Y-%m-%d %H:%M")
        ])

    output.seek(0)
    filename = f"informe_{campaign.nombre.replace(' ', '_')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

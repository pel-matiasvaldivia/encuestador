from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_tenant_db_dependency, get_current_tenant_id
from app.models import Campaign, Contact
from app.schemas import CampaignCreate, CampaignResponse
from app.tasks.celery_worker import send_survey
from app.core.config import settings

router = APIRouter()

@router.post("/", response_model=CampaignResponse)
def create_campaign(campaign_in: CampaignCreate, db: Session = Depends(get_tenant_db_dependency)):
    campaign = Campaign(nombre=campaign_in.nombre, canal=campaign_in.canal)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Associate contacts if provided, otherwise you might want a separate endpoint.
    # For simplicity, we just create the campaign here.
    return campaign

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

@router.get("/", response_model=List[CampaignResponse])
def get_campaigns(db: Session = Depends(get_tenant_db_dependency)):
    return db.query(Campaign).order_by(Campaign.fecha_inicio.desc()).all()

from sqlalchemy import text
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models import Contact, Response, Tenant
from app.schemas import SurveyResponse

router = APIRouter()

# The survey endpoints are public, so they don't use the JWT token.
# However, we need to know the tenant_id. We can find the contact across schemas,
# or we can pass tenant_id in the URL. Since the schema requirement is strict,
# let's just search through all tenants for the contact ID.
# Or better, the survey URL can be /s/{tenant_id}/{contact_id}
# Wait, the requirements said: https://DOMAIN/s/{token_unico}
# If the contact ID is a UUID, we can find it by iterating through tenants,
# but a better approach is to store a mapping in the public schema or just iterate since there are few tenants.
# For this implementation, we will query the public.tenants table, then check each schema.

def get_tenant_for_contact(contact_id: str):
    from uuid import UUID
    try:
        contact_uuid = UUID(contact_id)
    except ValueError:
        return None, None
    db = SessionLocal()
    try:
        from app.models import Tenant
        tenants = db.query(Tenant).all()
        for tenant in tenants:
            db.execute(text(f'SET search_path TO "{tenant.id}"'))
            contact = db.query(Contact).filter(Contact.id == contact_id).first()
            if contact:
                return tenant.id, contact
        return None, None
    finally:
        db.close()

def get_tenant_for_campaign(campaign_id: str):
    db = SessionLocal()
    try:
        from app.models import Tenant, Campaign
        tenants = db.query(Tenant).all()
        for tenant in tenants:
            db.execute(text(f'SET search_path TO "{tenant.id}"'))
            campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if campaign:
                return tenant.id
        return None
    finally:
        db.close()

@router.get("/{token}")
def get_survey_data(token: str):
    tenant_id, contact = get_tenant_for_contact(token)
    if not contact:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    
    # Fetch custom questions from settings
    db = SessionLocal()
    try:
        db.execute(text(f'SET search_path TO "{tenant_id}"'))
        from app.models import TenantSettings
        settings = db.query(TenantSettings).filter(TenantSettings.id == 1).first()
        
        # Fallback to hardcoded defaults if settings or questions are missing
        questions = [
            (settings.question_1 if settings and settings.question_1 else "¿Cómo calificaría nuestro servicio en general?"),
            (settings.question_2 if settings and settings.question_2 else "¿Qué tan probable es que nos recomiende?"),
            (settings.question_3 if settings and settings.question_3 else "¿Cómo califica el tiempo de respuesta?"),
            (settings.question_4 if settings and settings.question_4 else "¿Cómo califica la amabilidad del personal?"),
            (settings.question_5 if settings and settings.question_5 else "¿Cómo califica la resolución de su problema?")
        ]
        
        return {
            "contacto": f"{contact.nombre} {contact.apellido}",
            "company_name": settings.company_name if settings and settings.company_name else "Sistema de Encuestas",
            "logo_url": settings.logo_url if settings else "",
            "preguntas": questions
        }
    finally:
        db.close()

@router.post("/{token}")
def submit_survey(token: str, response_data: SurveyResponse, c: str = None):
    # c is campaign_id passed as query param
    tenant_id, _ = get_tenant_for_contact(token)
    if not tenant_id:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
        
    db = SessionLocal()
    try:
        db.execute(text(f'SET search_path TO "{tenant_id}"'))
        
        # Mark contact as responded (using the current session)
        from uuid import UUID
        try:
            contact_uuid = UUID(token)
            campaign_uuid = UUID(c) if c else None
        except ValueError:
            raise HTTPException(status_code=400, detail="Identificador inválido")
        
        contact = db.query(Contact).filter(Contact.id == contact_uuid).first()
        if contact:
            contact.estado = "respondido"
            if response_data.nombre:
                contact.nombre = response_data.nombre
            if response_data.apellido:
                contact.apellido = response_data.apellido
            if response_data.razon_social:
                contact.razon_social = response_data.razon_social
            if response_data.cuit:
                contact.cuit = response_data.cuit
            if response_data.sector:
                contact.sector = response_data.sector
        
        # Save response
        new_response = Response(
            contact_id=contact_uuid,
            campaign_id=campaign_uuid,
            pregunta_1=response_data.pregunta_1,
            pregunta_2=response_data.pregunta_2,
            pregunta_3=response_data.pregunta_3,
            pregunta_4=response_data.pregunta_4,
            pregunta_5=response_data.pregunta_5
        )
        db.add(new_response)
        db.commit()
        
        # Trigger websocket notification
        from app.api.dashboard import notify_dashboard
        notify_dashboard(tenant_id, c)
        
        return {"message": "Respuestas guardadas exitosamente"}
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

from app.schemas import QRRegistration
@router.post("/qr-register/{campaign_id}")
def qr_register(campaign_id: str, reg: QRRegistration):
    tenant_id = get_tenant_for_campaign(campaign_id)
    if not tenant_id:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    
    db = SessionLocal()
    try:
        db.execute(text(f'SET search_path TO "{tenant_id}"'))
        new_contact = Contact(
            nombre=reg.nombre,
            apellido=reg.apellido,
            razon_social=reg.razon_social,
            cuit=reg.cuit,
            sector=reg.sector,
            contacto="Escaneo QR", 
            estado="pendiente"
        )
        db.add(new_contact)
        db.commit()
        db.refresh(new_contact)
        return {"survey_url": f"/s/{new_contact.id}?c={campaign_id}"}
    finally:
        db.close()

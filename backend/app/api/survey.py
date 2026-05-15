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
    db = SessionLocal()
    try:
        tenants = db.query(Tenant).all()
        for tenant in tenants:
            db.execute(f'SET search_path TO "{tenant.id}"')
            contact = db.query(Contact).filter(Contact.id == contact_id).first()
            if contact:
                return tenant.id, contact
        return None, None
    finally:
        db.close()

@router.get("/{token}")
def get_survey_data(token: str):
    tenant_id, contact = get_tenant_for_contact(token)
    if not contact:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    
    return {
        "contacto": f"{contact.nombre} {contact.apellido}",
        "preguntas": [
            "¿Cómo calificaría nuestro servicio en general?",
            "¿Qué tan probable es que nos recomiende?",
            "¿Cómo califica el tiempo de respuesta?",
            "¿Cómo califica la amabilidad del personal?",
            "¿Cómo califica la resolución de su problema?"
        ]
    }

@router.post("/{token}")
def submit_survey(token: str, response_data: SurveyResponse, c: str = None):
    # c is campaign_id passed as query param in launch_campaign
    tenant_id, contact = get_tenant_for_contact(token)
    if not contact:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
        
    db = SessionLocal()
    try:
        db.execute(f'SET search_path TO "{tenant_id}"')
        
        # Mark contact as responded
        contact = db.query(Contact).filter(Contact.id == token).first()
        contact.estado = "respondido"
        
        # Save response
        new_response = Response(
            contact_id=token,
            campaign_id=c,
            pregunta_1=response_data.pregunta_1,
            pregunta_2=response_data.pregunta_2,
            pregunta_3=response_data.pregunta_3,
            pregunta_4=response_data.pregunta_4,
            pregunta_5=response_data.pregunta_5
        )
        db.add(new_response)
        db.commit()
        
        # TODO: trigger websocket notification here
        from app.api.dashboard import notify_dashboard
        notify_dashboard(tenant_id, c)
        
        return {"message": "Respuestas guardadas exitosamente"}
    finally:
        db.close()

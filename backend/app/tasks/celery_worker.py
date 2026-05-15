from celery import Celery
import smtplib
from email.mime.text import MIMEText
from app.core.config import settings

celery_app = Celery("worker", broker=settings.REDIS_URL)

celery_app.conf.task_routes = {
    "app.tasks.celery_worker.send_survey": "main-queue"
}

@celery_app.task(name="app.tasks.celery_worker.send_survey")
def send_survey(contact_id: str, email: str, survey_url: str, canal: str, tenant_id: str):
    print(f"[{tenant_id}] Sending survey to {email} via {canal}. URL: {survey_url}")
    
    if canal in ["email", "ambos"]:
        try:
            msg = MIMEText(f"Por favor responde esta encuesta: {survey_url}")
            msg['Subject'] = 'Encuesta de Satisfacción'
            msg['From'] = settings.SMTP_USER
            msg['To'] = email

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USER and settings.SMTP_PASS:
                    server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)
            print(f"Email sent successfully to {email}")
        except Exception as e:
            print(f"Failed to send email to {email}: {e}")
            
    if canal in ["whatsapp", "ambos"]:
        # Stub para WhatsApp
        print(f"WhatsApp message queued for {email} (Contacto) with link: {survey_url}")
        
    # In a real scenario, we might want to update the DB status here,
    # but we'd need to create a new session with the tenant schema.
    return True

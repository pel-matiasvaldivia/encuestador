import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class Tenant(Base):
    __tablename__ = "tenants"
    __table_args__ = {"schema": "public"}
    
    id = Column(String, primary_key=True, index=True) # schema name
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    tenant_id = Column(String, ForeignKey("public.tenants.id"))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

# The following models live in each tenant's schema dynamically

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=False)
    contacto = Column(String, nullable=False)
    razon_social = Column(String)
    cuit = Column(String)
    sector = Column(String)
    estado = Column(String, default="pendiente") # pendiente, enviado, respondido
    created_at = Column(DateTime, default=datetime.utcnow)

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    canal = Column(String, nullable=False) # email, whatsapp, ambos
    estado = Column(String, default="creada") # creada, en_curso, finalizada
    fecha_inicio = Column(DateTime, default=datetime.utcnow)

class Response(Base):
    __tablename__ = "responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id"))
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"))
    pregunta_1 = Column(Integer)
    pregunta_2 = Column(Integer)
    pregunta_3 = Column(Integer)
    pregunta_4 = Column(Integer)
    pregunta_5 = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class TenantSettings(Base):
    __tablename__ = "tenant_settings"

    id = Column(Integer, primary_key=True, default=1)
    company_name = Column(String, default="")
    company_phone = Column(String, default="")
    company_address = Column(String, default="")
    logo_url = Column(String, default="")
    smtp_host = Column(String, default="")
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String, default="")
    smtp_pass = Column(String, default="")
    smtp_from = Column(String, default="")
    
    # Question Template
    question_1 = Column(String, default="¿Cómo calificaría nuestro servicio en general?")
    question_2 = Column(String, default="¿Qué tan probable es que nos recomiende?")
    question_3 = Column(String, default="¿Cómo califica el tiempo de respuesta?")
    question_4 = Column(String, default="¿Cómo califica la amabilidad del personal?")
    question_5 = Column(String, default="¿Cómo califica la resolución de su problema?")
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

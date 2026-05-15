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

# The following models will be created in each tenant's schema dynamically

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=False)
    razon_social = Column(String)
    contacto = Column(String, nullable=False)
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

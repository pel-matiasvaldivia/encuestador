from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    tenant_id: str

class TokenData(BaseModel):
    email: Optional[str] = None
    tenant_id: Optional[str] = None

class ContactBase(BaseModel):
    nombre: str
    apellido: str
    razon_social: Optional[str] = None
    contacto: str

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: UUID
    estado: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class CampaignBase(BaseModel):
    nombre: str
    canal: str

class CampaignCreate(CampaignBase):
    contact_ids: Optional[List[UUID]] = []

class CampaignResponse(CampaignBase):
    id: UUID
    estado: str
    fecha_inicio: datetime
    
    class Config:
        from_attributes = True

class SurveyResponse(BaseModel):
    pregunta_1: int
    pregunta_2: int
    pregunta_3: int
    pregunta_4: int
    pregunta_5: int

class DashboardStats(BaseModel):
    total_enviados: int
    total_respondidos: int
    tasa_respuesta: float
    promedio_general: float
    distribucion_estrellas: dict
    nps: float

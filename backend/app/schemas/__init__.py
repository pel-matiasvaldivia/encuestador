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
    tenant_id: Optional[str] = None
    is_superuser: bool = False

class TokenData(BaseModel):
    email: Optional[str] = None
    tenant_id: Optional[str] = None

class ContactBase(BaseModel):
    nombre: str
    apellido: str
    razon_social: Optional[str] = None
    contacto: str
    cuit: Optional[str] = None
    sector: Optional[str] = None

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: UUID
    estado: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class QRRegistration(BaseModel):
    nombre: str
    apellido: str
    razon_social: str
    cuit: str
    sector: Optional[str] = ""

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
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    razon_social: Optional[str] = None
    cuit: Optional[str] = None
    sector: Optional[str] = None

class DashboardStats(BaseModel):
    total_enviados: int
    total_respondidos: int
    tasa_respuesta: float
    promedio_general: float
    promedio_por_pregunta: dict
    nps: float

class TenantSettingsUpdate(BaseModel):
    company_name: Optional[str] = ""
    company_phone: Optional[str] = ""
    company_address: Optional[str] = ""
    smtp_host: Optional[str] = ""
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = ""
    smtp_pass: Optional[str] = ""
    smtp_from: Optional[str] = ""
    
    question_1: Optional[str] = ""
    question_2: Optional[str] = ""
    question_3: Optional[str] = ""
    question_4: Optional[str] = ""
    question_5: Optional[str] = ""

class TenantSettingsResponse(TenantSettingsUpdate):
    logo_url: Optional[str] = ""
    domain: Optional[str] = ""
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

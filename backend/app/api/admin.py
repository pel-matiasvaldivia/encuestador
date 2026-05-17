from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from pydantic import BaseModel

from app.db.session import get_db, engine
from app.models import Tenant, User, Base
from app.api.deps import get_current_user_token
from app.api.auth import pwd_context

router = APIRouter()

def get_current_superuser(payload: dict = Depends(get_current_user_token)):
    if not payload.get("is_superuser"):
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return payload

class TenantCreate(BaseModel):
    id: str
    name: str
    admin_email: str
    admin_password: str

class TenantResponse(BaseModel):
    id: str
    name: str

@router.get("/tenants", response_model=List[TenantResponse])
def get_tenants(db: Session = Depends(get_db), _: dict = Depends(get_current_superuser)):
    return db.query(Tenant).all()

@router.post("/tenants", response_model=TenantResponse)
def create_tenant(tenant_in: TenantCreate, db: Session = Depends(get_db), _: dict = Depends(get_current_superuser)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_in.id).first()
    if tenant:
        raise HTTPException(status_code=400, detail="El tenant ya existe")
        
    user_exists = db.query(User).filter(User.email == tenant_in.admin_email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="El email del administrador ya está en uso")
    
    new_tenant = Tenant(id=tenant_in.id, name=tenant_in.name)
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    
    new_user = User(
        email=tenant_in.admin_email,
        hashed_password=pwd_context.hash(tenant_in.admin_password),
        tenant_id=new_tenant.id
    )
    db.add(new_user)
    db.commit()
    
    # Create schema and tables
    db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{new_tenant.id}"'))
    db.commit()
    
    with engine.begin() as conn:
        conn.execute(text(f'SET search_path TO "{new_tenant.id}"'))
        tenant_tables = [t for t in Base.metadata.sorted_tables if getattr(t, "schema", None) != "public"]
        for table in tenant_tables:
            table.create(bind=conn, checkfirst=True)

    return new_tenant

@router.delete("/tenants/{tenant_id}")
def delete_tenant(tenant_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_superuser)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
        
    db.query(User).filter(User.tenant_id == tenant_id).delete()
    
    db.delete(tenant)
    db.commit()
    
    db.execute(text(f'DROP SCHEMA IF EXISTS "{tenant_id}" CASCADE'))
    db.commit()
    return {"message": "Tenant eliminado"}

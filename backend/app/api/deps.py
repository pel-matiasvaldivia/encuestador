from sqlalchemy import text
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import SessionLocal

security = HTTPBearer()

def get_current_user_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def get_current_tenant_id(
    request: Request,
    payload: dict = Depends(get_current_user_token)
):
    tenant_id = payload.get("tenant_id")
    is_superuser = payload.get("is_superuser", False)
    
    if is_superuser:
        override = request.headers.get("x-tenant-id")
        if override:
            return override
        return "public"
        
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    return tenant_id

def get_tenant_db_dependency(tenant_id: str = Depends(get_current_tenant_id)):
    db = SessionLocal()
    try:
        db.execute(text(f'SET search_path TO "{tenant_id}"'))
        yield db
    finally:
        db.close()

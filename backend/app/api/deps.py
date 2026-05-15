from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import SessionLocal

security = HTTPBearer()

def get_current_tenant_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        tenant_id: str = payload.get("tenant_id")
        if tenant_id is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        return tenant_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def get_tenant_db_dependency(tenant_id: str = Depends(get_current_tenant_id)):
    db = SessionLocal()
    try:
        db.execute(f'SET search_path TO "{tenant_id}"')
        yield db
    finally:
        db.close()

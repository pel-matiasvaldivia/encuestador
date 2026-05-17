import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_tenant_db_dependency, get_current_tenant_id
from app.models import TenantSettings
from app.schemas import TenantSettingsResponse, TenantSettingsUpdate

router = APIRouter()

UPLOAD_DIR = "/app/uploads"


def _get_or_create_settings(db: Session) -> TenantSettings:
    settings = db.query(TenantSettings).filter(TenantSettings.id == 1).first()
    if not settings:
        settings = TenantSettings(id=1)
        db.add(settings)
        db.commit()
        db.expire(settings)
        settings = db.query(TenantSettings).filter(TenantSettings.id == 1).first()
    return settings


@router.get("/", response_model=TenantSettingsResponse)
def get_settings(db: Session = Depends(get_tenant_db_dependency)):
    return _get_or_create_settings(db)


@router.put("/", response_model=TenantSettingsResponse)
def update_settings(
    payload: TenantSettingsUpdate,
    db: Session = Depends(get_tenant_db_dependency),
):
    s = _get_or_create_settings(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


@router.post("/logo", response_model=TenantSettingsResponse)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_tenant_db_dependency),
    tenant_id: str = Depends(get_current_tenant_id),
):
    allowed_ext = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"Formato no permitido. Use: {', '.join(allowed_ext)}")

    tenant_uploads = os.path.join(UPLOAD_DIR, tenant_id)
    os.makedirs(tenant_uploads, exist_ok=True)

    dest = os.path.join(tenant_uploads, f"logo{ext}")
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    logo_url = f"/uploads/{tenant_id}/logo{ext}"

    s = _get_or_create_settings(db)
    s.logo_url = logo_url
    db.commit()
    db.refresh(s)
    return s

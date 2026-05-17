from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List
import csv
import io
from app.api.deps import get_tenant_db_dependency
from app.models import Contact
from app.schemas import ContactResponse

router = APIRouter()

@router.post("/upload", response_model=dict)
async def upload_contacts(file: UploadFile = File(...), db: Session = Depends(get_tenant_db_dependency)):
    if not file.filename.lower().endswith('.csv'):
        error_msg = f"El archivo debe ser un CSV, detectado: {file.filename}"
        print(f"UPLOAD ERROR: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    contents = await file.read()
    decoded = contents.decode('utf-8-sig')
    
    # Use newline='' for proper universal newline handling
    f_io = io.StringIO(decoded, newline='')
    reader = csv.DictReader(f_io)
    
    if not reader.fieldnames:
        print("UPLOAD ERROR: El CSV estÃ¡ vacÃ­o o invÃ¡lido.")
        raise HTTPException(status_code=400, detail="El CSV estÃ¡ vacÃ­o o invÃ¡lido.")
        
    cleaned_fieldnames = [f.strip() for f in reader.fieldnames]
    
    expected_cols = ["Nombre", "Apellido", "RazonSocial", "Contacto"]
    if not all(col in cleaned_fieldnames for col in expected_cols):
        error_msg = f"El CSV debe contener: {', '.join(expected_cols)}. Detectado: {cleaned_fieldnames}"
        print(f"UPLOAD ERROR: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    errors = []
    success_count = 0
    row_num = 1
    
    for row in reader:
        # Strip keys mapping just in case
        row_clean = {k.strip() if k else k: v for k, v in row.items()}
        row_num += 1
        nombre = row_clean.get("Nombre", "").strip()
        apellido = row_clean.get("Apellido", "").strip()
        contacto = row_clean.get("Contacto", "").strip()
        
        if not nombre or not apellido or not contacto:
            errors.append({"fila": row_num, "error": "Nombre, Apellido y Contacto son obligatorios"})
            continue
            
        contact = Contact(
            nombre=nombre,
            apellido=apellido,
            razon_social=row_clean.get("RazonSocial", "").strip(),
            contacto=contacto
        )
        db.add(contact)
        success_count += 1
        
    db.commit()
    return {"message": f"{success_count} contactos importados exitosamente", "errores": errors}

@router.get("/", response_model=List[ContactResponse])
def get_contacts(db: Session = Depends(get_tenant_db_dependency)):
    contacts = db.query(Contact).all()
    return contacts

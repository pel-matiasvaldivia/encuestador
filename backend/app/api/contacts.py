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
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")
    
    contents = await file.read()
    decoded = contents.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    expected_cols = ["Nombre", "Apellido", "RazonSocial", "Contacto"]
    if not all(col in reader.fieldnames for col in expected_cols):
        raise HTTPException(status_code=400, detail=f"El CSV debe contener las columnas: {', '.join(expected_cols)}")
    
    errors = []
    success_count = 0
    row_num = 1
    
    for row in reader:
        row_num += 1
        nombre = row.get("Nombre", "").strip()
        apellido = row.get("Apellido", "").strip()
        contacto = row.get("Contacto", "").strip()
        
        if not nombre or not apellido or not contacto:
            errors.append({"fila": row_num, "error": "Nombre, Apellido y Contacto son obligatorios"})
            continue
            
        contact = Contact(
            nombre=nombre,
            apellido=apellido,
            razon_social=row.get("RazonSocial", "").strip(),
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

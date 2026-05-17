import asyncio
import os
import sys

# Add backend to sys path so we can import app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from sqlalchemy import text
from app.db.session import SessionLocal, engine
from app.models import Tenant, User, Base
from app.api.auth import pwd_context

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_db():
    print("Iniciando seeder...")
    
    # 1. Ensure public schema objects are created
    public_tables = [t for t in Base.metadata.sorted_tables if getattr(t, "schema", None) == "public"]
    Base.metadata.create_all(bind=engine, tables=public_tables)
    
    db = SessionLocal()
    
    superadmin = db.query(User).filter(User.email == "superadmin@satisfactio.com").first()
    if not superadmin:
        print("Creando superadmin...")
        superadmin = User(
            email="superadmin@satisfactio.com",
            hashed_password=get_password_hash("admin123"),
            tenant_id=None,
            is_superuser=True
        )
        db.add(superadmin)
        db.commit()

    tenants_to_create = [
        {"id": "alpha", "name": "Empresa Alpha", "admin_email": "admin@alpha.com"},
        {"id": "beta", "name": "Empresa Beta", "admin_email": "admin@beta.com"}
    ]
    
    for t_data in tenants_to_create:
        tenant_id = t_data["id"]
        
        # Check if tenant exists
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            print(f"Creando tenant {tenant_id}...")
            tenant = Tenant(id=tenant_id, name=t_data["name"])
            db.add(tenant)
            
            user = User(
                email=t_data["admin_email"],
                hashed_password=get_password_hash("password123"),
                tenant_id=tenant_id
            )
            db.add(user)
            db.commit()
        
        # Create schema for tenant if not exists
        db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{tenant_id}"'))
        db.commit()
        
        # We also need to create tables in this schema
        print(f"Creando tablas para schema {tenant_id}...")
        
        with engine.begin() as conn:
            conn.execute(text(f'SET search_path TO "{tenant_id}"'))
            tenant_tables = [t for t in Base.metadata.sorted_tables if getattr(t, "schema", None) != "public"]
            for table in tenant_tables:
                table.create(bind=conn, checkfirst=True)
                
    db.close()
    print("Seeding completado.")

if __name__ == "__main__":
    seed_db()

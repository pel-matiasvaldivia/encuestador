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
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
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
        # SQLAlchemy's Base.metadata.create_all won't easily do this dynamically for specific schemas
        # without overriding the schema on all tables.
        # Instead, we set search_path and use raw SQL or a custom create_all approach.
        print(f"Creando tablas para schema {tenant_id}...")
        
        # A simple way to create tables in the schema without alembic multi-tenant complexity during seed:
        for table in Base.metadata.sorted_tables:
            if table.schema != "public":
                table.schema = tenant_id
                table.create(bind=engine, checkfirst=True)
                table.schema = None # reset
                
    db.close()
    print("Seeding completado.")

if __name__ == "__main__":
    seed_db()

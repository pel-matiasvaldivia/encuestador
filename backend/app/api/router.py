from fastapi import APIRouter
from app.api import auth, contacts, campaigns, survey, dashboard

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
router.include_router(survey.router, prefix="/survey", tags=["survey"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

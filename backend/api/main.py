"""
TikToken API main application.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import get_settings
from api.health import router as health_router

# Load settings
settings = get_settings()

# Initialize FastAPI
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router, tags=["health"])


@app.on_event("startup")
async def startup():
    """Initialize services on startup"""
    # We'll add service initialization here as needed
    pass


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown"""
    # We'll add cleanup code here as needed
    pass

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": app.version}

@app.get("/")
async def root():
    return {"message": "Welcome to TikToken API"} 
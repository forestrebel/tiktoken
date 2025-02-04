"""Minimal FastAPI backend."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.health import router as health_router

app = FastAPI(title="TikToken API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(health_router, tags=["health"])

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to TikToken API"} 
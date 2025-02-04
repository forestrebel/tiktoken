"""Core API service."""
import os
from typing import Dict, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="TikToken Core API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TokenizeRequest(BaseModel):
    """Tokenization request."""
    text: str

class TokenizeResponse(BaseModel):
    """Tokenization response."""
    tokens: list[str]
    token_count: int

@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/api/v1/tokenize", response_model=TokenizeResponse)
async def tokenize(request: TokenizeRequest) -> TokenizeResponse:
    """Tokenize text using AI service."""
    ai_service_url = os.getenv("AI_SERVICE_URL", "http://ai-service:8081")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ai_service_url}/api/v1/tokenize",
                json={"text": request.text},
                timeout=5.0
            )
            response.raise_for_status()
            return TokenizeResponse(**response.json())
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"AI Service error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") 
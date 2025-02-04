from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random
import time

app = FastAPI(title="Tiktoken AI Mock Service")

class TokenRequest(BaseModel):
    text: str

class TokenResponse(BaseModel):
    tokens: list[str]
    token_count: int

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "tiktoken-ai-mock",
        "version": "0.1.0"
    }

@app.post("/api/tokenize", response_model=TokenResponse)
async def tokenize_text(request: TokenRequest):
    # Simulate processing time
    time.sleep(random.uniform(0.1, 0.3))
    
    # Mock tokenization
    tokens = request.text.split()
    
    # Randomly simulate errors (10% chance)
    if random.random() < 0.1:
        raise HTTPException(
            status_code=500,
            detail="Simulated AI service error"
        )
    
    return TokenResponse(
        tokens=tokens,
        token_count=len(tokens)
    )

@app.get("/api/status")
async def service_status():
    # Simulate different load states
    load = random.random()
    
    return {
        "status": "operational",
        "current_load": f"{load:.2f}",
        "queue_size": random.randint(0, 100),
        "response_time_ms": random.randint(50, 200)
    } 
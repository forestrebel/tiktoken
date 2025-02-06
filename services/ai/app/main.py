"""AI Service mock."""
import os
from typing import Dict, List

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="TikToken AI Service")

class TokenizeRequest(BaseModel):
    """Tokenization request."""
    text: str

class TokenizeResponse(BaseModel):
    """Tokenization response."""
    tokens: List[str]
    token_count: int

@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/api/v1/tokenize", response_model=TokenizeResponse)
async def tokenize(request: TokenizeRequest) -> TokenizeResponse:
    """Mock tokenization endpoint."""
    if not os.getenv("MOCK_MODE"):
        # In production, this would call the real tokenizer
        raise NotImplementedError("Production tokenization not implemented")
    
    # Simple mock: split on spaces and treat punctuation as tokens
    import re
    tokens = [
        token for token in re.findall(r'\w+|[^\w\s]', request.text)
        if token.strip()
    ]
    
    return TokenizeResponse(
        tokens=tokens,
        token_count=len(tokens)
    ) 
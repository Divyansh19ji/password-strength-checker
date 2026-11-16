# backend/app.py
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add current directory and parent directory to path so imports work anywhere
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from api.check import evaluate_password

app = FastAPI(
    title="Password Strength Checker",
    description="Evaluates password entropy, extreme patterns, and breached password lists."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CheckRequest(BaseModel):
    password: str

@app.get("/")
@app.get("/api")
@app.get("/api/check")
async def root():
    return {
        "status": "online",
        "service": "Password Strength & Entropy Checker API"
    }

@app.post("/check")
@app.post("/api/check")
async def check(req: CheckRequest):
    return evaluate_password(req.password)

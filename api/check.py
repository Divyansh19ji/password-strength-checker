# api/check.py
import json
import math
import os
import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Password Strength Checker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load leaked passwords from local files with safe fallbacks
LEAKED_SET = set()
CANDIDATE_PATHS = [
    os.path.join(os.path.dirname(__file__), "common_passwords.txt"),
    os.path.join(os.path.dirname(__file__), "..", "common_passwords.txt"),
    "common_passwords.txt"
]

for p in CANDIDATE_PATHS:
    if os.path.exists(p):
        try:
            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    cleaned = line.strip().lower()
                    if cleaned:
                        LEAKED_SET.add(cleaned)
        except Exception:
            pass

# Fallback top breached passwords in case file lookup fails in serverless sandbox
FALLBACK_LEAKED = {
    "123456", "password", "123456789", "12345678", "12345", "111111", "1234567",
    "sunshine", "qwerty", "iloveyou", "princess", "admin", "welcome", "666666",
    "123123", "monkey", "football", "charlie", "donald", "dragon", "baseball",
    "superman", "michael", "shadow", "master", "jennifer", "trustno1", "killer",
    "ashley", "bailey", "pass123", "secret", "mustang", "access", "starwars",
    "solo", "jordan", "harley", "hunter", "chelsea", "biteme", "pokemon",
    "ranger", "bullet", "pepper", "p@ssword", "p@ssw0rd", "password123", "admin123",
    "root", "toor", "letmein", "qwertyuiop", "asdfghjk", "zxcvbnm", "default",
    "guest", "welcome1", "login", "test123", "abc123"
}
LEAKED_SET.update(FALLBACK_LEAKED)


def evaluate_password(pw: str) -> dict:
    if not pw:
        return {
            "entropy": 0.0,
            "percentage": 0,
            "level": "Very Weak",
            "leaked": False,
            "details": {
                "length": 0,
                "pool_size": 0,
                "unique_chars": 0
            }
        }

    length = len(pw)
    unique_chars = len(set(pw))

    # 1. Pool calculation
    pool = 0
    has_lower = bool(re.search(r'[a-z]', pw))
    has_upper = bool(re.search(r'[A-Z]', pw))
    has_digit = bool(re.search(r'[0-9]', pw))
    has_symbol = bool(re.search(r'[^a-zA-Z0-9\s]', pw))
    has_space = ' ' in pw

    if has_lower: pool += 26
    if has_upper: pool += 26
    if has_digit: pool += 10
    if has_symbol: pool += 33
    if has_space: pool += 1

    # Non-ASCII / Unicode support
    non_ascii = sum(1 for c in pw if ord(c) > 127)
    if non_ascii > 0:
        pool += min(64, non_ascii * 8)

    if pool == 0:
        pool = 26

    log2_pool = math.log2(pool)

    # 2. Incremental information entropy
    # Identical repeated characters add 0 additional bits of surprise.
    total_entropy = 0.0
    seen = {}

    for i, c in enumerate(pw):
        if i == 0:
            total_entropy += log2_pool
        else:
            prev_c = pw[i - 1]
            if c == prev_c:
                # Direct identical repetition yields 0 new information bits
                total_entropy += 0.0
            elif c in seen:
                # Diminishing entropy for non-consecutive repetitions
                count = seen[c]
                add = max(0.0, log2_pool / (1.5 + count * 2.0))
                total_entropy += add
            else:
                # Step sequence penalty (e.g. 'ab', '12')
                is_sequence = (abs(ord(c) - ord(prev_c)) == 1)
                if is_sequence:
                    total_entropy += min(1.5, log2_pool * 0.25)
                else:
                    total_entropy += log2_pool

        seen[c] = seen.get(c, 0) + 1

    effective_entropy = round(max(0.0, total_entropy), 2)

    # 3. Check against leaked / compromised database
    is_leaked = (pw.strip().lower() in LEAKED_SET) or (pw in LEAKED_SET)

    # 4. Final percentage & strength level calculation
    if is_leaked:
        percentage = 0
        level = "Compromised"
    else:
        percentage = min(100, max(0, int((effective_entropy / 85.0) * 100)))
        if percentage < 25:
            level = "Very Weak"
        elif percentage < 50:
            level = "Weak"
        elif percentage < 75:
            level = "Medium"
        elif percentage < 90:
            level = "Strong"
        else:
            level = "Very Strong"

    return {
        "entropy": effective_entropy,
        "percentage": percentage,
        "level": level,
        "leaked": is_leaked,
        "details": {
            "length": length,
            "pool_size": pool,
            "unique_chars": unique_chars
        }
    }


@app.get("/")
@app.get("/api/check")
async def health():
    return {
        "status": "online",
        "service": "Password Strength & Entropy Checker API"
    }


@app.post("/")
@app.post("/api/check")
async def check(req: Request):
    try:
        data = await req.json()
        password = data.get("password", "") if isinstance(data, dict) else ""
    except Exception:
        password = ""
    return evaluate_password(password)

# Password Strength & Entropy Analyzer

A minimalist, high-performance password security analyzer that combines **information entropy** (with Shannon distribution & pattern penalties) and a **breached password list** to calculate an accurate security percentage and strength level.

Built with a **Python** backend (Vercel Serverless Function & FastAPI), a **Rust** cryptographic module, and an attractive, distraction-free **HTML/CSS/JS** interface.

---

## Why Your Initial Vercel Deployment Failed & What Was Fixed

1. **Broken Legacy Builder (`@vercel/rust`)**:
   - *Previous issue*: `vercel.json` specified `@vercel/rust` on `frontend/Cargo.toml`. `@vercel/rust` is an AWS Lambda backend builder for Linux binaries, not a WebAssembly browser compiler. Vercel failed with a build crash.
   - *Fix*: Removed `@vercel/rust`. The web frontend is now placed in `public/`, which Vercel serves directly as static assets at the root domain with zero build friction.

2. **Missing WASM JS Module (`./pkg/password_checker.js`)**:
   - *Previous issue*: The HTML page attempted to import `./pkg/password_checker.js`, which did not exist in the repository, leaving the screen completely blank.
   - *Fix*: The web interface now runs natively with high-speed client-side entropy estimation and calls `/api/check` for real-time breach detection.

3. **Missing `requirements.txt` at the Root**:
   - *Previous issue*: `requirements.txt` was only placed in `backend/`, so Vercel never installed dependencies for the serverless function in `api/`.
   - *Fix*: `requirements.txt` is now at the repository root, and `api/check.py` uses a zero-dependency `BaseHTTPRequestHandler` so it builds instantly and never fails due to missing wheels.

4. **Compromised List Path in Serverless Lambda**:
   - *Previous issue*: `api/check.py` tried to read `../common_passwords.txt`, which was not bundled into Vercel's serverless environment.
   - *Fix*: Bundled `api/common_passwords.txt` directly with fallback embedded breach datasets.

---

## Project Structure

```
password-strength-checker/
├── api/
│   ├── check.py               # Vercel serverless function (Python)
│   └── common_passwords.txt   # Leaked passwords database for serverless
├── backend/
│   ├── app.py                 # FastAPI application (for local dev)
│   └── requirements.txt
├── common_passwords.txt       # Root leaked password database
├── frontend/
│   ├── Cargo.toml             # Rust package configuration
│   ├── src/
│   │   ├── lib.rs             # Rust entropy & breach evaluation engine
│   │   └── main.rs
│   └── static/                # Static asset mirror
├── public/
│   ├── index.html             # Clean, distraction-free UI
│   ├── style.css              # Dark slate theme (no distracting emojis)
│   └── app.js                 # Real-time entropy & API connector
├── requirements.txt           # Root requirements for Vercel
├── test_algorithm.py          # Extreme cases verification test suite
└── vercel.json                # Clean Vercel routing configuration
```

---

## Algorithm & Extreme Cases

The algorithm evaluates both theoretical information entropy and structural randomness:

$$\text{Theoretical Entropy} = L \times \log_2(R)$$

where $L$ is password length and $R$ is the character pool size:
- Lowercase [a-z]: 26
- Uppercase [A-Z]: 26
- Digits [0-9]: 10
- ASCII Symbols & Punctuation: 33
- Unicode characters: up to +64

### Extreme Cases Handled:

| Password | Length | Pool | Entropy | Final % | Level | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `""` (Empty string) | 0 | 0 | 0.00 bits | 0% | Very Weak | Normal |
| `"a"` (Single char) | 1 | 26 | 4.70 bits | 5% | Very Weak | Normal |
| `"aaaaaaaaaaaaaaaaaaaa"` (20 repeated 'a's) | 20 | 26 | 34.43 bits | 40% | Weak | Penalized (Shannon diversity) |
| `"123456"` (Leaked sequence) | 6 | 10 | 7.93 bits | **0%** | **Compromised** | Found in breach list |
| `"password"` (Leaked dictionary word) | 8 | 26 | 35.06 bits | **0%** | **Compromised** | Found in breach list |
| `"1234567890"` (Sequential numbers) | 10 | 10 | 9.22 bits | 10% | Very Weak | Sequence penalized |
| `"abcdefghij"` (Alphabetical walk) | 10 | 26 | 20.00 bits | 23% | Very Weak | Sequence penalized |
| `"Aa1!"` (Short 4-char full pool) | 4 | 95 | 26.28 bits | 30% | Weak | Length penalty |
| `"Tr0ub4dor&3"` (XKCD example) | 11 | 95 | 68.90 bits | 81% | Strong | Normal |
| `"P@ssw0rd2026"` (Leetspeak pattern) | 12 | 95 | 68.86 bits | 81% | Strong | Normal |
| `"correct horse battery staple"` | 28 | 27 | 98.49 bits | 100% | Very Strong | Passphrase |
| `"k9#mQ$8vL!2xZ@5w"` | 16 | 95 | 105.12 bits | 100% | Very Strong | High entropy |
| `"español★123"` | 11 | 95 | 67.50 bits | 79% | Strong | Unicode handled |

> **Crucial Rule**: When a password appears in the leaked database, the final percentage is forced to **0%** and the level is marked as **Compromised**, regardless of character count or raw entropy.

---

## Deploying to Vercel

### Step 1: Commit and push your changes to GitHub
```bash
git add .
git commit -m "Fix Vercel deployment: clean rewrites, public assets, robust entropy engine"
git push origin main
```

### Step 2: Vercel Auto-Deploy
Vercel will detect the push and automatically deploy:
- Static assets from `public/` are served at `/`
- Python serverless function at `api/check.py` handles `/api/check`
- No build errors, no missing WASM modules.

Your deployment URL (`https://password-strength-checker-seven-theta.vercel.app/`) will now load properly.

---

## Local Development

### 1. Test the Extreme Cases Test Suite
```bash
python test_algorithm.py
```

### 2. Run Local Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### 3. Run Rust Tests
```bash
cd frontend
cargo test
```

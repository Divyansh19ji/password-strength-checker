# Password Strength & Entropy Analyzer

A minimalist, high-performance password security analyzer that combines **information entropy** (with incremental surprise calculation and pattern penalties) and a **breached password database** to calculate an accurate security percentage and strength level.

Built with a **Python** backend (Vercel Serverless Function & FastAPI), a **Rust** cryptographic module, and an attractive, distraction-free **HTML/CSS/JS** interface.

---

## Key Features

1. **Information Entropy**:
   - Computes search-space pool size based on character classes (lowercase, uppercase, numbers, symbols, spaces, Unicode).
   - **Zero Entropy for Repetitions**: Typing repeated identical letters (e.g. `aa`, `aaa`, `aaaaaaaa`) contributes **0 additional bits of entropy**.
   - Keyboard sequence walks (e.g. `1234`, `abcd`, `qwerty`) are penalized.
2. **Breach / Leak Database Integration**:
   - Cross-references passwords against high-frequency leaked credential lists.
   - **Crucial Rule**: Any password found in a breach list immediately drops to **0% Score** and is marked as **Compromised**, regardless of character count or raw entropy.
3. **Clean & Distraction-Free UI**:
   - Minimalist, dark slate aesthetic (no tacky AI emojis).
   - Real-time client-side calculation for zero input lag + server verification against the breach database.
   - Full composition checklist and security metrics grid.
4. **Vercel Deployable**:
   - Zero-config static asset serving for the frontend.
   - Native Python FastAPI ASGI serverless API at `/api/check`.

---

## Project Structure

```
password-strength-checker/
├── .gitignore                 # Standard Python, Rust, and Vercel gitignore
├── README.md                  # Project documentation
├── requirements.txt           # Python dependencies for Vercel
├── vercel.json                # Vercel serverless rewrite configuration
├── common_passwords.txt       # Breached credentials dataset
├── test_algorithm.py          # Extreme cases verification script
│
├── api/                       # Vercel Serverless Functions
│   ├── check.py               # FastAPI serverless handler
│   └── common_passwords.txt   # Bundled breach dataset
│
├── backend/                   # Local Development Server
│   ├── app.py                 # FastAPI local server
│   └── requirements.txt
│
├── frontend/                  # Rust Module
│   ├── Cargo.toml             # Rust package configuration
│   └── src/
│       └── lib.rs             # Rust entropy & verification engine
│
├── public/                    # Production Static Assets (Vercel CDN)
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── index.html                 # Root static fallback
├── style.css
└── app.js
```

---

## Algorithm & Extreme Cases

The algorithm evaluates information entropy incrementally:

$$\text{First Character: } E = \log_2(R)$$
$$\text{Consecutive Identical Character: } \Delta E = 0.00\text{ bits}$$
$$\text{Sequential Step: } \Delta E \le 1.50\text{ bits}$$
$$\text{New Unique Character: } \Delta E = \log_2(R)\text{ bits}$$

### Extreme Cases Verified

| Password Description | Input | Entropy | Score % | Level | Status |
| :--- | :--- | :---: | :---: | :---: | :--- |
| Empty password | `""` | 0.00 b | 0% | Very Weak | Normal |
| Single char | `"a"` | 4.70 b | 5% | Very Weak | Normal |
| Two repeated letters | `"aa"` | 4.70 b | 5% | Very Weak | Repetition: 0 bits |
| Five repeated letters | `"aaaaa"` | 4.70 b | 5% | Very Weak | Repetition: 0 bits |
| 20 identical characters | `"aaaaaaaaaaaaaaaaaaaa"` | 4.70 b | 5% | Very Weak | Repetition: 0 bits |
| 10 identical numbers | `"1111111111"` | 3.32 b | 3% | Very Weak | Repetition: 0 bits |
| Leaked numeric sequence | `"123456"` | 7.47 b | **0%** | **Compromised** | Found in breach list |
| Leaked dictionary word | `"password"` | 32.90 b | **0%** | **Compromised** | Found in breach list |
| 10-digit sequence | `"1234567890"` | 13.29 b | 15% | Very Weak | Sequence penalized |
| 10-letter alphabet run | `"abcdefghij"` | 15.28 b | 17% | Very Weak | Sequence penalized |
| 2-character alternating cycle | `"ababababab"` | 12.51 b | 14% | Very Weak | Low variety |
| Short 4-char full pool | `"Aa1!"` | 26.28 b | 30% | Weak | Length penalty |
| XKCD famous example | `"Tr0ub4dor&3"` | 67.58 b | 79% | Strong | Normal |
| Common leetspeak pattern | `"P@ssw0rd2026"` | 62.88 b | 73% | Medium | Normal |
| Long 4-word passphrase | `"correct horse battery staple"` | 68.69 b | 80% | Strong | Passphrase |
| 16-char random complex | `"k9#mQ$8vL!2xZ@5w"` | 105.12 b | 100% | Very Strong | High entropy |
| Unicode with special glyph | `"español★123"` | 60.68 b | 71% | Medium | Handled |

---

## Local Development

### 1. Test Extreme Cases
```bash
python test_algorithm.py
```

### 2. Run Local Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### 3. Open Frontend
Open `index.html` in your browser (or use Python's built-in HTTP server: `python -m http.server 3000`).

---

## Deploy to Vercel

```bash
git add .
git commit -m "Fresh clean rebuild: complete entropy engine, breach detector, and clean UI"
git push origin main --force
```

Vercel will detect the push and automatically deploy both the static frontend and the serverless Python API.

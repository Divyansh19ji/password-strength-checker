import math
import re

def calculate_password_strength(pw: str, leaked_set: set):
    if not pw:
        return {
            "entropy": 0.0,
            "percentage": 0,
            "level": "Very Weak",
            "leaked": False,
            "details": {"length": 0, "pool_size": 0, "unique_chars": 0}
        }
    
    length = len(pw)
    unique_chars = len(set(pw))
    
    # 1. Pool size calculation based on character classes
    pool = 0
    has_lower = bool(re.search(r'[a-z]', pw))
    has_upper = bool(re.search(r'[A-Z]', pw))
    has_digit = bool(re.search(r'[0-9]', pw))
    has_symbol = bool(re.search(r'[^a-zA-Z0-9\s]', pw))
    has_space = ' ' in pw
    
    if has_lower:
        pool += 26
    if has_upper:
        pool += 26
    if has_digit:
        pool += 10
    if has_symbol:
        pool += 33
    if has_space:
        pool += 1
        
    # Unicode / non-ASCII handling
    non_ascii = sum(1 for c in pw if ord(c) > 127)
    if non_ascii > 0:
        pool += min(64, non_ascii * 8)
        
    if pool == 0:
        pool = 26
        
    # 2. Shannon entropy calculation
    counts = {}
    for c in pw:
        counts[c] = counts.get(c, 0) + 1
    shannon_h = 0.0
    for count in counts.values():
        p = count / length
        shannon_h -= p * math.log2(p)
        
    # 3. Theoretical vs Effective entropy
    theoretical = length * math.log2(pool)
    unique_ratio = unique_chars / length
    
    if length == 1:
        effective_entropy = math.log2(pool)
    else:
        max_shannon = math.log2(min(length, pool))
        shannon_factor = (shannon_h / max_shannon) if max_shannon > 0 else 0.0
        # Diversity scales down repetitive strings like "aaaaaaaaaa"
        diversity = 0.35 + 0.65 * (0.5 * unique_ratio + 0.5 * shannon_factor)
        effective_entropy = theoretical * diversity
        
    # 4. Sequential and repetitive pattern detection
    lower_pw = pw.lower()
    seq_penalty = 0
    sequences = [
        '01234567890',
        'abcdefghijklmnopqrstuvwxyz',
        'qwertyuiop',
        'asdfghjkl',
        'zxcvbnm'
    ]
    for s in sequences:
        for i in range(len(s) - 2):
            sub = s[i:i+3]
            if sub in lower_pw or sub[::-1] in lower_pw:
                seq_penalty += 3
                
    effective_entropy = max(0.0, effective_entropy - seq_penalty)
    effective_entropy = round(effective_entropy, 2)
    
    # 5. Check against leaked list
    is_leaked = (pw.strip().lower() in leaked_set) or (pw in leaked_set)
    
    # 6. Final percentage and Level computation
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

if __name__ == "__main__":
    leaked = {"123456", "password", "qwerty", "letmein", "admin", "welcome", "p@ssword", "admin123", "iloveyou"}

    test_cases = [
        ("", "Empty password"),
        ("a", "Single char"),
        ("aaaaaaaaaaaaaaaaaaaa", "20 identical characters"),
        ("123456", "Leaked numeric sequence"),
        ("password", "Leaked common dictionary word"),
        ("1234567890", "10-digit sequence"),
        ("abcdefghij", "10-letter alphabet run"),
        ("Aa1!", "Short 4-char full pool"),
        ("Tr0ub4dor&3", "XKCD famous example"),
        ("P@ssw0rd2026", "Common leetspeak pattern"),
        ("correct horse battery staple", "Long 4-word passphrase"),
        ("k9#mQ$8vL!2xZ@5w", "16-char random complex string"),
        ("español★123", "Unicode with special glyph")
    ]

    print(f"{'Password Description':<32} | {'Input':<25} | {'Entropy':<9} | {'%':<4} | {'Level':<12} | Leaked")
    print("-" * 96)
    for pw, desc in test_cases:
        res = calculate_password_strength(pw, leaked)
        print(f"{desc:<32} | {repr(pw):<25} | {res['entropy']:>6.2f} b | {res['percentage']:>3}% | {res['level']:<12} | {res['leaked']}")


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
    
    non_ascii = sum(1 for c in pw if ord(c) > 127)
    if non_ascii > 0:
        pool += min(64, non_ascii * 8)
        
    if pool == 0:
        pool = 26
        
    log2_pool = math.log2(pool)
    
    # 2. Incremental information entropy
    # Repeating the exact same character contributes 0 additional bits of entropy!
    total_entropy = 0.0
    seen = {}
    
    for i, c in enumerate(pw):
        if i == 0:
            total_entropy += log2_pool
        else:
            prev_c = pw[i - 1]
            if c == prev_c:
                # Direct repetition of the same character adds 0 entropy
                total_entropy += 0.0
            elif c in seen:
                # Diminishing entropy for non-consecutive repetitions
                count = seen[c]
                add = max(0.0, log2_pool / (1.5 + count * 2.0))
                total_entropy += add
            else:
                # Sequential character walk (e.g. 'ab', '12')
                is_sequence = (abs(ord(c) - ord(prev_c)) == 1)
                if is_sequence:
                    total_entropy += min(1.5, log2_pool * 0.25)
                else:
                    total_entropy += log2_pool
                    
        seen[c] = seen.get(c, 0) + 1
        
    effective_entropy = round(max(0.0, total_entropy), 2)
    
    # 3. Check against leaked list
    is_leaked = (pw.strip().lower() in leaked_set) or (pw in leaked_set)
    
    # 4. Final percentage and Level computation
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
        ("a", "Single char 'a'"),
        ("aa", "Two repeated 'aa'"),
        ("aaaaa", "Five repeated 'aaaaa'"),
        ("aaaaaaaaaaaaaaaaaaaa", "20 identical characters"),
        ("1111111111", "10 identical numbers"),
        ("123456", "Leaked numeric sequence"),
        ("password", "Leaked common dictionary word"),
        ("1234567890", "10-digit sequence"),
        ("abcdefghij", "10-letter alphabet run"),
        ("ababababab", "2-character alternating cycle"),
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

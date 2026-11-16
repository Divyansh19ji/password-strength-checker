// frontend/src/lib.rs
// Rust implementation of the Password Security & Entropy Analyzer

use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::collections::{HashMap, HashSet};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct AnalysisDetails {
    pub length: usize,
    pub pool_size: usize,
    pub unique_chars: usize,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct PasswordAnalysis {
    pub entropy: f64,
    pub percentage: u32,
    pub level: String,
    pub leaked: bool,
    pub details: AnalysisDetails,
}

/// Evaluates password entropy, pattern repetitions, and breach status.
#[wasm_bindgen]
pub fn analyze_password(password: &str, leaked_list: &str) -> JsValue {
    let leaked_set: HashSet<String> = leaked_list
        .lines()
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty())
        .collect();

    let result = evaluate_strength(password, &leaked_set);
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

pub fn evaluate_strength(password: &str, leaked_set: &HashSet<String>) -> PasswordAnalysis {
    if password.is_empty() {
        return PasswordAnalysis {
            entropy: 0.0,
            percentage: 0,
            level: "Very Weak".to_string(),
            leaked: false,
            details: AnalysisDetails {
                length: 0,
                pool_size: 0,
                unique_chars: 0,
            },
        };
    }

    let length = password.chars().count();
    let unique_chars: HashSet<char> = password.chars().collect();
    let unique_count = unique_chars.len();

    // 1. Calculate pool size
    let mut pool: usize = 0;
    let has_lower = password.chars().any(|c| c.is_ascii_lowercase());
    let has_upper = password.chars().any(|c| c.is_ascii_uppercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    let has_space = password.chars().any(|c| c == ' ');
    let has_symbol = password.chars().any(|c| c.is_ascii_punctuation());
    let non_ascii_count = password.chars().filter(|c| !c.is_ascii()).count();

    if has_lower { pool += 26; }
    if has_upper { pool += 26; }
    if has_digit { pool += 10; }
    if has_symbol { pool += 33; }
    if has_space { pool += 1; }
    if non_ascii_count > 0 {
        pool += (non_ascii_count * 8).min(64);
    }
    if pool == 0 {
        pool = 26;
    }

    // 2. Shannon entropy (character distribution)
    let mut counts: HashMap<char, usize> = HashMap::new();
    for c in password.chars() {
        *counts.entry(c).or_insert(0) += 1;
    }

    let len_f = length as f64;
    let mut shannon_h: f64 = 0.0;
    for &count in counts.values() {
        let p = count as f64 / len_f;
        shannon_h -= p * p.log2();
    }

    // 3. Theoretical vs Effective entropy
    let theoretical = len_f * (pool as f64).log2();
    let unique_ratio = unique_count as f64 / len_f;

    let effective_entropy = if length == 1 {
        (pool as f64).log2()
    } else {
        let max_shannon = (length.min(pool) as f64).log2();
        let shannon_factor = if max_shannon > 0.0 { (shannon_h / max_shannon).min(1.0) } else { 0.0 };
        let diversity = 0.35 + 0.65 * (0.5 * unique_ratio + 0.5 * shannon_factor);
        theoretical * diversity
    };

    // 4. Pattern penalties (sequences)
    let lower_pw = password.to_lowercase();
    let mut seq_penalty: f64 = 0.0;
    let sequences = [
        "01234567890",
        "abcdefghijklmnopqrstuvwxyz",
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
    ];

    for seq in &sequences {
        let chars: Vec<char> = seq.chars().collect();
        if chars.len() >= 3 {
            for i in 0..(chars.len() - 2) {
                let sub: String = chars[i..i+3].iter().collect();
                let rev: String = sub.chars().rev().collect();
                if lower_pw.contains(&sub) || lower_pw.contains(&rev) {
                    seq_penalty += 3.0;
                }
            }
        }
    }

    let final_entropy = (effective_entropy - seq_penalty).max(0.0);
    let rounded_entropy = (final_entropy * 100.0).round() / 100.0;

    // 5. Check breached list
    let is_leaked = leaked_set.contains(&password.trim().to_lowercase())
        || leaked_set.contains(password);

    // 6. Percentage and level
    let (percentage, level) = if is_leaked {
        (0, "Compromised".to_string())
    } else {
        let pct = ((rounded_entropy / 85.0) * 100.0).clamp(0.0, 100.0) as u32;
        let lvl = if pct < 25 {
            "Very Weak"
        } else if pct < 50 {
            "Weak"
        } else if pct < 75 {
            "Medium"
        } else if pct < 90 {
            "Strong"
        } else {
            "Very Strong"
        };
        (pct, lvl.to_string())
    };

    PasswordAnalysis {
        entropy: rounded_entropy,
        percentage,
        level,
        leaked: is_leaked,
        details: AnalysisDetails {
            length,
            pool_size: pool,
            unique_chars: unique_count,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extreme_cases() {
        let mut leaked = HashSet::new();
        leaked.insert("123456".to_string());
        leaked.insert("password".to_string());

        // Empty string
        let empty = evaluate_strength("", &leaked);
        assert_eq!(empty.entropy, 0.0);
        assert_eq!(empty.percentage, 0);

        // Repetitive character extreme case
        let repetitive = evaluate_strength("aaaaaaaaaaaaaaaaaaaa", &leaked);
        assert!(repetitive.entropy < 45.0); // Diversity penalty prevents 140 bits
        assert!(!repetitive.leaked);

        // Leaked password
        let leaked_test = evaluate_strength("password", &leaked);
        assert!(leaked_test.leaked);
        assert_eq!(leaked_test.percentage, 0);
        assert_eq!(leaked_test.level, "Compromised");

        // High entropy complex password
        let strong = evaluate_strength("k9#mQ$8vL!2xZ@5w", &leaked);
        assert!(strong.entropy > 85.0);
        assert_eq!(strong.percentage, 100);
        assert_eq!(strong.level, "Very Strong");
    }
}


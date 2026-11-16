// frontend/src/lib.rs
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

    let log2_pool = (pool as f64).log2();

    // 2. Incremental information entropy
    // Repeating the exact same character contributes 0 additional bits of entropy!
    let mut total_entropy: f64 = 0.0;
    let mut seen: HashMap<char, usize> = HashMap::new();
    let chars: Vec<char> = password.chars().collect();

    for i in 0..chars.len() {
        let c = chars[i];
        if i == 0 {
            total_entropy += log2_pool;
        } else {
            let prev_c = chars[i - 1];
            if c == prev_c {
                // Direct consecutive identical repetition adds 0 entropy
                total_entropy += 0.0;
            } else if let Some(&count) = seen.get(&c) {
                // Diminishing entropy for non-consecutive repetitions
                let add = (log2_pool / (1.5 + (count as f64) * 2.0)).max(0.0);
                total_entropy += add;
            } else {
                let diff = (c as i32 - prev_c as i32).abs();
                if diff == 1 {
                    total_entropy += (log2_pool * 0.25).min(1.5);
                } else {
                    total_entropy += log2_pool;
                }
            }
        }
        *seen.entry(c).or_insert(0) += 1;
    }

    let rounded_entropy = ((total_entropy.max(0.0)) * 100.0).round() / 100.0;

    // 3. Check breached list
    let is_leaked = leaked_set.contains(&password.trim().to_lowercase())
        || leaked_set.contains(password);

    // 4. Percentage and level
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

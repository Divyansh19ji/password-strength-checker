// public/app.js
(function () {
  'use strict';

  const passwordInput = document.getElementById('password-input');
  const toggleVisibility = document.getElementById('toggle-visibility');
  const eyeIcon = document.getElementById('eye-icon');
  
  const scoreText = document.getElementById('score-text');
  const meterFill = document.getElementById('meter-fill');
  const levelBadge = document.getElementById('level-badge');
  const breachStatus = document.getElementById('breach-status');
  
  const metricEntropy = document.getElementById('metric-entropy');
  const metricPool = document.getElementById('metric-pool');
  const metricLength = document.getElementById('metric-length');
  const metricUnique = document.getElementById('metric-unique');

  const critLower = document.getElementById('crit-lower');
  const critUpper = document.getElementById('crit-upper');
  const critDigit = document.getElementById('crit-digit');
  const critSymbol = document.getElementById('crit-symbol');
  const critLength = document.getElementById('crit-length');
  const critLeak = document.getElementById('crit-leak');

  let debounceTimer = null;

  // Toggle password visibility
  toggleVisibility.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    eyeIcon.innerHTML = isPassword
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  });

  // Client-side quick entropy estimator for zero-latency typing
  function estimateLocalEntropy(pw) {
    if (!pw) return { entropy: 0, pool: 0, unique: 0, length: 0 };
    const len = pw.length;
    const unique = new Set(pw).size;
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/[0-9]/.test(pw)) pool += 10;
    if (/[^a-zA-Z0-9\s]/.test(pw)) pool += 33;
    if (/\s/.test(pw)) pool += 1;
    if (pool === 0) pool = 26;

    // Approximate Shannon factor
    const counts = {};
    for (let c of pw) counts[c] = (counts[c] || 0) + 1;
    let shannon = 0;
    for (let k in counts) {
      let p = counts[k] / len;
      shannon -= p * Math.log2(p);
    }

    let theoretical = len * Math.log2(pool);
    let diversity = len === 1 ? 1 : 0.35 + 0.65 * (0.5 * (unique / len) + 0.5 * (shannon / Math.log2(Math.min(len, pool))));
    let ent = theoretical * diversity;
    return {
      entropy: Math.max(0, Math.round(ent * 100) / 100),
      pool,
      unique,
      length: len
    };
  }

  function updateCriteria(pw, isLeaked) {
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pw);
    const hasLen = pw.length >= 12;

    critLower.className = 'crit-item ' + (hasLower ? 'valid' : '');
    critUpper.className = 'crit-item ' + (hasUpper ? 'valid' : '');
    critDigit.className = 'crit-item ' + (hasDigit ? 'valid' : '');
    critSymbol.className = 'crit-item ' + (hasSymbol ? 'valid' : '');
    critLength.className = 'crit-item ' + (hasLen ? 'valid' : '');
    
    if (!pw) {
      critLeak.className = 'crit-item';
      critLeak.querySelector('span:last-child').textContent = 'Not in breach database';
    } else if (isLeaked) {
      critLeak.className = 'crit-item failed';
      critLeak.querySelector('span:last-child').textContent = 'Found in known breach list!';
    } else {
      critLeak.className = 'crit-item valid';
      critLeak.querySelector('span:last-child').textContent = 'Not in known breach list';
    }
  }

  function renderState(data) {
    const { entropy, percentage, level, leaked, details } = data;

    // Text & Bar
    scoreText.textContent = `${percentage}%`;
    meterFill.style.width = `${percentage}%`;

    // Colors & Badges
    levelBadge.className = 'badge';
    let barColor = 'var(--color-neutral)';

    if (percentage === 0 && !leaked && (!details || details.length === 0)) {
      levelBadge.classList.add('neutral');
      levelBadge.textContent = 'Awaiting Input';
    } else if (leaked) {
      levelBadge.classList.add('compromised');
      levelBadge.textContent = 'Compromised';
      barColor = 'var(--color-danger)';
    } else if (percentage < 25) {
      levelBadge.classList.add('very-weak');
      levelBadge.textContent = level || 'Very Weak';
      barColor = 'var(--color-danger)';
    } else if (percentage < 50) {
      levelBadge.classList.add('weak');
      levelBadge.textContent = level || 'Weak';
      barColor = 'var(--color-warning)';
    } else if (percentage < 75) {
      levelBadge.classList.add('medium');
      levelBadge.textContent = level || 'Medium';
      barColor = 'var(--color-medium)';
    } else if (percentage < 90) {
      levelBadge.classList.add('strong');
      levelBadge.textContent = level || 'Strong';
      barColor = 'var(--color-strong)';
    } else {
      levelBadge.classList.add('very-strong');
      levelBadge.textContent = level || 'Very Strong';
      barColor = 'var(--color-super)';
    }

    meterFill.style.backgroundColor = barColor;

    // Breach status pill
    breachStatus.className = 'breach-badge';
    if (!details || details.length === 0) {
      breachStatus.classList.add('clean');
      breachStatus.textContent = 'Unchecked';
    } else if (leaked) {
      breachStatus.classList.add('compromised');
      breachStatus.textContent = 'Breached';
    } else {
      breachStatus.classList.add('safe');
      breachStatus.textContent = 'Safe';
    }

    // Metrics grid
    metricEntropy.textContent = `${Number(entropy).toFixed(2)} bits`;
    metricPool.textContent = details ? details.pool_size : '0';
    metricLength.textContent = details ? details.length : '0';
    metricUnique.textContent = details ? details.unique_chars : '0';
  }

  async function checkPasswordOnServer(pw) {
    if (!pw) {
      renderState({
        entropy: 0,
        percentage: 0,
        level: 'Very Weak',
        leaked: false,
        details: { length: 0, pool_size: 0, unique_chars: 0 }
      });
      updateCriteria('', false);
      return;
    }

    try {
      const resp = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });

      if (!resp.ok) {
        throw new Error(`Server returned status ${resp.status}`);
      }

      const data = await resp.json();
      renderState(data);
      updateCriteria(pw, data.leaked);
    } catch (err) {
      console.warn('API fetch fallback to local estimation:', err);
      // Fallback gracefully to local calculation if offline
      const est = estimateLocalEntropy(pw);
      const pct = Math.min(100, Math.max(0, Math.floor((est.entropy / 85.0) * 100)));
      renderState({
        entropy: est.entropy,
        percentage: pct,
        level: pct < 25 ? 'Very Weak' : pct < 50 ? 'Weak' : pct < 75 ? 'Medium' : pct < 90 ? 'Strong' : 'Very Strong',
        leaked: false,
        details: {
          length: est.length,
          pool_size: est.pool,
          unique_chars: est.unique
        }
      });
      updateCriteria(pw, false);
    }
  }

  passwordInput.addEventListener('input', (e) => {
    const val = e.target.value;

    // Instant client feedback
    if (!val) {
      renderState({
        entropy: 0,
        percentage: 0,
        level: 'Very Weak',
        leaked: false,
        details: { length: 0, pool_size: 0, unique_chars: 0 }
      });
      updateCriteria('', false);
      return;
    }

    const est = estimateLocalEntropy(val);
    const estPct = Math.min(100, Math.max(0, Math.floor((est.entropy / 85.0) * 100)));
    renderState({
      entropy: est.entropy,
      percentage: estPct,
      level: estPct < 25 ? 'Very Weak' : estPct < 50 ? 'Weak' : estPct < 75 ? 'Medium' : estPct < 90 ? 'Strong' : 'Very Strong',
      leaked: false,
      details: {
        length: est.length,
        pool_size: est.pool,
        unique_chars: est.unique
      }
    });
    updateCriteria(val, false);

    // Debounce backend check to verify leaked credentials & exact Shannon penalties
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      checkPasswordOnServer(val);
    }, 150);
  });
})();


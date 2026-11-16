// app.js
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

  toggleVisibility.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    eyeIcon.innerHTML = isPassword
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  });

  // Mathematically sound incremental entropy calculation
  // Repeated identical letters add 0 bits of information entropy.
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

    const log2Pool = Math.log2(pool);
    let totalEntropy = 0;
    const seen = {};

    for (let i = 0; i < len; i++) {
      const c = pw[i];
      if (i === 0) {
        totalEntropy += log2Pool;
      } else {
        const prevC = pw[i - 1];
        if (c === prevC) {
          // Exactly the same character repeated consecutively adds 0 entropy!
          totalEntropy += 0;
        } else if (seen[c] !== undefined) {
          // Non-consecutive repeated character adds diminishing information
          const count = seen[c];
          totalEntropy += Math.max(0, log2Pool / (1.5 + count * 2.0));
        } else {
          // Check for sequential character steps (e.g. 'ab', '12')
          const isSeq = Math.abs(c.charCodeAt(0) - prevC.charCodeAt(0)) === 1;
          if (isSeq) {
            totalEntropy += Math.min(1.5, log2Pool * 0.25);
          } else {
            totalEntropy += log2Pool;
          }
        }
      }
      seen[c] = (seen[c] || 0) + 1;
    }

    return {
      entropy: Math.max(0, Math.round(totalEntropy * 100) / 100),
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

    scoreText.textContent = `${percentage}%`;
    meterFill.style.width = `${percentage}%`;

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

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      checkPasswordOnServer(val);
    }, 150);
  });
})();

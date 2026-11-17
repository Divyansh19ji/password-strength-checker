// app.js — Entropy Lab Interactive Frontend
(function () {
  'use strict';

  // DOM References
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderPercent = document.getElementById('preloader-percent');
  const preloaderStatus = document.getElementById('preloader-status');
  const preloaderHex = document.getElementById('preloader-hex');

  const mainCard = document.getElementById('main-card');
  const inputWrapper = document.getElementById('input-wrapper');
  const engineStatus = document.getElementById('engine-status');
  const engineStatusText = engineStatus.querySelector('.live-text');

  const passwordInput = document.getElementById('password-input');
  const toggleVisibility = document.getElementById('toggle-visibility');
  const eyeIcon = document.getElementById('eye-icon');
  const generateBtn = document.getElementById('generate-btn');
  const copyBtn = document.getElementById('copy-btn');
  const copyLabel = document.getElementById('copy-label');
  const clearBtn = document.getElementById('clear-btn');

  const scoreText = document.getElementById('score-text');
  const gaugeProgress = document.getElementById('gauge-progress');
  const shieldStateIcon = document.getElementById('shield-state-icon');
  const meterFill = document.getElementById('meter-fill');
  const levelBadge = document.getElementById('level-badge');
  const breachStatus = document.getElementById('breach-status');
  const breachText = document.getElementById('breach-text');
  const crackTimeEl = document.getElementById('crack-time');
  const visualizerEl = document.getElementById('entropy-visualizer');

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
  const criteriaCounter = document.getElementById('criteria-counter');

  const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 52; // 326.7256...
  let debounceTimer = null;
  let latestRequestId = 0;
  let displayedScore = 0;
  let scoreAnimFrame = null;
  let lastStateKey = 'neutral';
  let wasBreached = false;

  // Theme RGB lookup for interactive background canvas
  const STATE_RGB = {
    neutral: [56, 189, 248],
    compromised: [239, 68, 68],
    'very-weak': [239, 68, 68],
    weak: [249, 115, 22],
    medium: [234, 179, 8],
    strong: [34, 197, 94],
    'very-strong': [16, 185, 129]
  };
  let activeCanvasRGB = [...STATE_RGB.neutral];
  let targetCanvasRGB = [...STATE_RGB.neutral];

  // =========================================================
  // 1. PRELOADER INTRO SEQUENCE
  // =========================================================
  function runPreloader() {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      finishPreloader(true);
      return;
    }

    const stages = [
      { threshold: 0, text: 'INITIALIZING CRYPTO ENGINE' },
      { threshold: 28, text: 'MOUNTING BREACH INDEX' },
      { threshold: 62, text: 'CALIBRATING ENTROPY METRICS' },
      { threshold: 88, text: 'SYSTEM READY' }
    ];

    const duration = 1450;
    const startTime = performance.now();

    function randomHexBlock() {
      const a = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
      const b = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
      return `0x${a} :: 0x${b}`;
    }

    let lastHexTick = 0;

    function tick(now) {
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      // Smooth ease-out curve
      const eased = 1 - Math.pow(1 - rawProgress, 2.4);
      const pct = Math.min(100, Math.round(eased * 100));

      preloaderBar.style.width = `${pct}%`;
      preloaderPercent.textContent = `${String(pct).padStart(2, '0')}%`;

      if (now - lastHexTick > 75) {
        preloaderHex.textContent = randomHexBlock();
        lastHexTick = now;
      }

      for (let i = stages.length - 1; i >= 0; i--) {
        if (pct >= stages[i].threshold) {
          preloaderStatus.textContent = stages[i].text;
          break;
        }
      }

      if (rawProgress < 1) {
        requestAnimationFrame(tick);
      } else {
        preloaderHex.textContent = '0xFFFF :: VERIFIED';
        setTimeout(() => finishPreloader(false), 180);
      }
    }

    requestAnimationFrame(tick);
  }

  function finishPreloader(immediate) {
    if (preloader) {
      preloader.classList.add('fade-out');
      setTimeout(() => {
        preloader.style.display = 'none';
      }, immediate ? 0 : 700);
    }
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    setTimeout(() => {
      passwordInput.focus();
    }, immediate ? 0 : 280);
  }

  // =========================================================
  // 2. INTERACTIVE CONSTELLATION CANVAS BACKGROUND
  // =========================================================
  function initBackgroundCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(26, Math.min(68, Math.floor((width * height) / 22000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.36,
        vy: (Math.random() - 0.5) * 0.36,
        r: Math.random() * 1.7 + 0.9,
        phase: Math.random() * Math.PI * 2
      }));
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener('mouseleave', () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    resize();

    function draw(time) {
      ctx.clearRect(0, 0, width, height);

      // Smoothly interpolate canvas color toward active security state
      for (let c = 0; c < 3; c++) {
        activeCanvasRGB[c] += (targetCanvasRGB[c] - activeCanvasRGB[c]) * 0.045;
      }
      const r = Math.round(activeCanvasRGB[0]);
      const g = Math.round(activeCanvasRGB[1]);
      const b = Math.round(activeCanvasRGB[2]);

      const maxDist = 145;
      const mouseDist = 175;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!prefersReduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }

        // Subtle attraction toward cursor
        const mdx = mouse.x - p.x;
        const mdy = mouse.y - p.y;
        const mLen = Math.hypot(mdx, mdy);
        if (mLen < mouseDist && mLen > 1) {
          const alpha = (1 - mLen / mouseDist) * 0.28;
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        // Connect neighboring nodes
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.16;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        const twinkle = 0.45 + 0.35 * Math.sin(time * 0.0018 + p.phase);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${twinkle.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReduced) {
        requestAnimationFrame(draw);
      }
    }

    requestAnimationFrame(draw);
  }

  // =========================================================
  // 3. CARD MOUSE SPOTLIGHT
  // =========================================================
  if (mainCard) {
    mainCard.addEventListener('mousemove', (e) => {
      const rect = mainCard.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      mainCard.style.setProperty('--mouse-x', `${x.toFixed(1)}%`);
      mainCard.style.setProperty('--mouse-y', `${y.toFixed(1)}%`);
    }, { passive: true });
  }

  // =========================================================
  // 4. INCREMENTAL ENTROPY & PER-CHARACTER SPECTRUM ENGINE
  // =========================================================
  function estimateLocalEntropy(pw) {
    if (!pw) {
      return { entropy: 0, pool: 0, unique: 0, length: 0, steps: [] };
    }
    const len = pw.length;
    const unique = new Set(pw).size;
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/[0-9]/.test(pw)) pool += 10;
    if (/[^a-zA-Z0-9\s]/.test(pw)) pool += 33;
    if (/\s/.test(pw)) pool += 1;

    let nonAscii = 0;
    for (let i = 0; i < len; i++) {
      if (pw.charCodeAt(i) > 127) nonAscii++;
    }
    if (nonAscii > 0) {
      pool += Math.min(64, nonAscii * 8);
    }
    if (pool === 0) pool = 26;

    const log2Pool = Math.log2(pool);
    let totalEntropy = 0;
    const seen = {};
    const steps = [];

    for (let i = 0; i < len; i++) {
      const c = pw[i];
      let delta = 0;
      let reason = 'unique';

      if (i === 0) {
        delta = log2Pool;
      } else {
        const prevC = pw[i - 1];
        if (c === prevC) {
          delta = 0;
          reason = 'repeat';
        } else if (seen[c] !== undefined) {
          const count = seen[c];
          delta = Math.max(0, log2Pool / (1.5 + count * 2.0));
          reason = 'reuse';
        } else {
          const isSeq = Math.abs(c.charCodeAt(0) - prevC.charCodeAt(0)) === 1;
          if (isSeq) {
            delta = Math.min(1.5, log2Pool * 0.25);
            reason = 'sequence';
          } else {
            delta = log2Pool;
          }
        }
      }

      totalEntropy += delta;
      steps.push({ delta, reason });
      seen[c] = (seen[c] || 0) + 1;
    }

    return {
      entropy: Math.max(0, Math.round(totalEntropy * 100) / 100),
      pool,
      unique,
      length: len,
      steps
    };
  }

  function renderEntropySpectrum(pw, isLeaked) {
    if (!pw) {
      visualizerEl.innerHTML = '<div class="visualizer-empty">Awaiting keystroke stream...</div>';
      return;
    }

    const est = estimateLocalEntropy(pw);
    const maxBars = 36;
    const slice = est.steps.length > maxBars ? est.steps.slice(-maxBars) : est.steps;

    const frag = document.createDocumentFragment();
    slice.forEach((step, idx) => {
      const bar = document.createElement('span');
      let tier = 'tier-high';
      let heightPct = 14;

      if (isLeaked) {
        tier = 'tier-zero';
        heightPct = 22 + Math.min(55, step.delta * 6);
      } else if (step.delta <= 0.05) {
        tier = 'tier-zero';
        heightPct = 14;
      } else if (step.delta <= 2.2) {
        tier = 'tier-low';
        heightPct = 36;
      } else if (step.delta <= 5.0) {
        tier = 'tier-mid';
        heightPct = 66;
      } else {
        tier = 'tier-high';
        heightPct = Math.min(100, Math.round((step.delta / 6.8) * 100));
      }

      bar.className = `spectrum-bar ${tier}`;
      bar.style.height = `${Math.max(14, heightPct)}%`;
      bar.style.animationDelay = `${Math.min(idx * 12, 160)}ms`;
      bar.title = `Position #${idx + 1}: +${step.delta.toFixed(2)} bits (${step.reason})`;
      frag.appendChild(bar);
    });

    visualizerEl.innerHTML = '';
    visualizerEl.appendChild(frag);
  }

  function formatCrackTime(entropy, isLeaked, hasInput) {
    if (!hasInput) return 'Est. crack: —';
    if (isLeaked) return 'Est. crack: Instant (Breached)';
    if (entropy <= 0) return 'Est. crack: Instant';

    // Assumes offline GPU cluster at 10^10 guesses/sec
    const seconds = Math.pow(2, entropy) / 1e10;
    if (seconds < 0.01) return 'Est. crack: Instant';
    if (seconds < 1) return 'Est. crack: < 1 second';
    if (seconds < 60) return `Est. crack: ${seconds.toFixed(1)} sec`;
    const mins = seconds / 60;
    if (mins < 60) return `Est. crack: ${mins.toFixed(1)} mins`;
    const hrs = mins / 60;
    if (hrs < 24) return `Est. crack: ${hrs.toFixed(1)} hours`;
    const days = hrs / 24;
    if (days < 365) return `Est. crack: ${Math.round(days)} days`;
    const years = days / 365.25;
    if (years < 1000) return `Est. crack: ${Math.round(years)} years`;
    if (years < 1e6) return `Est. crack: ${(years / 1000).toFixed(1)}k years`;
    if (years < 1e9) return `Est. crack: ${(years / 1e6).toFixed(1)}M years`;
    return 'Est. crack: Centuries+';
  }

  // =========================================================
  // 5. ANIMATED UI RENDERING
  // =========================================================
  function animateScoreTo(targetPct) {
    if (scoreAnimFrame) cancelAnimationFrame(scoreAnimFrame);
    const startVal = displayedScore;
    const diff = targetPct - startVal;
    if (Math.abs(diff) < 0.5) {
      displayedScore = targetPct;
      scoreText.textContent = `${Math.round(targetPct)}%`;
      return;
    }

    const duration = 260;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      displayedScore = startVal + diff * eased;
      scoreText.textContent = `${Math.round(displayedScore)}%`;
      if (t < 1) {
        scoreAnimFrame = requestAnimationFrame(step);
      } else {
        displayedScore = targetPct;
        scoreText.textContent = `${Math.round(targetPct)}%`;
      }
    }

    scoreAnimFrame = requestAnimationFrame(step);
  }

  function updateShieldIcon(stateKey) {
    if (stateKey === lastStateKey) return;
    lastStateKey = stateKey;

    if (stateKey === 'compromised') {
      shieldStateIcon.innerHTML = `
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      `;
    } else if (stateKey === 'strong' || stateKey === 'very-strong') {
      shieldStateIcon.innerHTML = `
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <polyline points="9 12 11 14 15 10"></polyline>
      `;
    } else if (stateKey === 'very-weak' || stateKey === 'weak') {
      shieldStateIcon.innerHTML = `
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <line x1="9.5" y1="9.5" x2="14.5" y2="14.5"></line>
        <line x1="14.5" y1="9.5" x2="9.5" y2="14.5"></line>
      `;
    } else {
      shieldStateIcon.innerHTML = `
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      `;
    }

    shieldStateIcon.classList.remove('pop');
    void shieldStateIcon.offsetWidth;
    shieldStateIcon.classList.add('pop');
    setTimeout(() => shieldStateIcon.classList.remove('pop'), 260);
  }

  function updateCriteria(pw, isLeaked) {
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pw);
    const hasLen = pw.length >= 12;

    critLower.className = 'crit-item' + (hasLower ? ' valid' : '');
    critUpper.className = 'crit-item' + (hasUpper ? ' valid' : '');
    critDigit.className = 'crit-item' + (hasDigit ? ' valid' : '');
    critSymbol.className = 'crit-item' + (hasSymbol ? ' valid' : '');
    critLength.className = 'crit-item' + (hasLen ? ' valid' : '');

    let passed = [hasLower, hasUpper, hasDigit, hasSymbol, hasLen].filter(Boolean).length;
    const leakLabel = critLeak.querySelector('.crit-label-text');

    if (!pw) {
      critLeak.className = 'crit-item';
      leakLabel.textContent = 'Not in breach database';
    } else if (isLeaked) {
      critLeak.className = 'crit-item failed';
      leakLabel.textContent = 'Found in known breach list';
    } else {
      critLeak.className = 'crit-item valid';
      leakLabel.textContent = 'Not in known breach list';
      passed += 1;
    }

    criteriaCounter.textContent = `${passed} / 6 PASSED`;
  }

  function renderState(data, rawPassword) {
    const { entropy, percentage, level, leaked, details } = data;
    const hasInput = Boolean(details && details.length > 0);

    animateScoreTo(percentage);
    meterFill.style.width = `${percentage}%`;

    const offset = GAUGE_CIRCUMFERENCE * (1 - percentage / 100);
    gaugeProgress.style.strokeDashoffset = offset.toFixed(2);

    levelBadge.className = 'badge';
    let stateKey = 'neutral';

    if (percentage === 0 && !leaked && !hasInput) {
      stateKey = 'neutral';
      levelBadge.classList.add('neutral');
      levelBadge.textContent = 'Awaiting Input';
    } else if (leaked) {
      stateKey = 'compromised';
      levelBadge.classList.add('compromised');
      levelBadge.textContent = 'Compromised';
    } else if (percentage < 25) {
      stateKey = 'very-weak';
      levelBadge.classList.add('very-weak');
      levelBadge.textContent = level || 'Very Weak';
    } else if (percentage < 50) {
      stateKey = 'weak';
      levelBadge.classList.add('weak');
      levelBadge.textContent = level || 'Weak';
    } else if (percentage < 75) {
      stateKey = 'medium';
      levelBadge.classList.add('medium');
      levelBadge.textContent = level || 'Medium';
    } else if (percentage < 90) {
      stateKey = 'strong';
      levelBadge.classList.add('strong');
      levelBadge.textContent = level || 'Strong';
    } else {
      stateKey = 'very-strong';
      levelBadge.classList.add('very-strong');
      levelBadge.textContent = level || 'Very Strong';
    }

    document.body.setAttribute('data-state', stateKey);
    targetCanvasRGB = STATE_RGB[stateKey] || STATE_RGB.neutral;
    updateShieldIcon(stateKey);

    // Subtle shake alert on newly detected breach
    if (leaked && !wasBreached && mainCard) {
      mainCard.classList.remove('shake-alert');
      void mainCard.offsetWidth;
      mainCard.classList.add('shake-alert');
    }
    wasBreached = Boolean(leaked);

    breachStatus.className = 'breach-badge';
    if (!hasInput) {
      breachStatus.classList.add('clean');
      breachText.textContent = 'Unchecked';
    } else if (leaked) {
      breachStatus.classList.add('compromised');
      breachText.textContent = 'Breached';
    } else {
      breachStatus.classList.add('safe');
      breachText.textContent = 'No Breach Hit';
    }

    metricEntropy.textContent = `${Number(entropy).toFixed(2)} bits`;
    metricPool.textContent = details ? details.pool_size : '0';
    metricLength.textContent = details ? details.length : '0';
    metricUnique.textContent = details ? details.unique_chars : '0';

    crackTimeEl.textContent = formatCrackTime(Number(entropy), leaked, hasInput);
    if (typeof rawPassword === 'string') {
      renderEntropySpectrum(rawPassword, leaked);
    }
  }

  function setScanningState(isScanning) {
    inputWrapper.classList.toggle('is-scanning', isScanning);
    engineStatus.classList.toggle('scanning', isScanning);
    engineStatusText.textContent = isScanning ? 'VERIFYING BREACH DB' : 'ENGINE READY';
  }

  // =========================================================
  // 6. SERVER API VERIFICATION
  // =========================================================
  async function checkPasswordOnServer(pw, reqId) {
    if (!pw) {
      setScanningState(false);
      return;
    }

    setScanningState(true);
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
      if (reqId !== latestRequestId) return; // Ignore stale responses
      renderState(data, pw);
      updateCriteria(pw, data.leaked);
    } catch (err) {
      if (reqId !== latestRequestId) return;
      console.warn('API fetch fallback to local estimation:', err);
      const est = estimateLocalEntropy(pw);
      const pct = Math.min(100, Math.max(0, Math.floor((est.entropy / 85.0) * 100)));
      renderState(
        {
          entropy: est.entropy,
          percentage: pct,
          level:
            pct < 25 ? 'Very Weak' : pct < 50 ? 'Weak' : pct < 75 ? 'Medium' : pct < 90 ? 'Strong' : 'Very Strong',
          leaked: false,
          details: {
            length: est.length,
            pool_size: est.pool,
            unique_chars: est.unique
          }
        },
        pw
      );
      updateCriteria(pw, false);
    } finally {
      if (reqId === latestRequestId) {
        setScanningState(false);
      }
    }
  }

  // =========================================================
  // 7. INTERACTIONS & CONTROLS
  // =========================================================
  function handlePasswordChange(val) {
    latestRequestId += 1;
    const currentReqId = latestRequestId;
    clearTimeout(debounceTimer);

    if (!val) {
      setScanningState(false);
      renderState(
        {
          entropy: 0,
          percentage: 0,
          level: 'Very Weak',
          leaked: false,
          details: { length: 0, pool_size: 0, unique_chars: 0 }
        },
        ''
      );
      updateCriteria('', false);
      return;
    }

    // Immediate local render for zero input lag
    const est = estimateLocalEntropy(val);
    const estPct = Math.min(100, Math.max(0, Math.floor((est.entropy / 85.0) * 100)));
    renderState(
      {
        entropy: est.entropy,
        percentage: estPct,
        level:
          estPct < 25 ? 'Very Weak' : estPct < 50 ? 'Weak' : estPct < 75 ? 'Medium' : estPct < 90 ? 'Strong' : 'Very Strong',
        leaked: false,
        details: {
          length: est.length,
          pool_size: est.pool,
          unique_chars: est.unique
        }
      },
      val
    );
    updateCriteria(val, false);

    debounceTimer = setTimeout(() => {
      checkPasswordOnServer(val, currentReqId);
    }, 160);
  }

  passwordInput.addEventListener('input', (e) => {
    handlePasswordChange(e.target.value);
  });

  toggleVisibility.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    eyeIcon.innerHTML = isPassword
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  });

  // Cryptographically strong password generator
  function generateStrongPassword(length = 16) {
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const symbols = '!@#$%^&*()-_=+[]{}';
    const all = lower + upper + digits + symbols;

    function pick(charset) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      return charset[buf[0] % charset.length];
    }

    const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
    while (chars.length < length) {
      chars.push(pick(all));
    }

    // Fisher-Yates shuffle using crypto RNG
    for (let i = chars.length - 1; i > 0; i--) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      const j = buf[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      const generated = generateStrongPassword(16);
      passwordInput.value = generated;
      passwordInput.setAttribute('type', 'text');
      eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
      handlePasswordChange(generated);
      passwordInput.focus();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!passwordInput.value) return;
      try {
        await navigator.clipboard.writeText(passwordInput.value);
        copyBtn.classList.add('copied');
        copyLabel.textContent = 'Copied';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyLabel.textContent = 'Copy';
        }, 1400);
      } catch (_) {
        passwordInput.select();
        document.execCommand('copy');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      passwordInput.value = '';
      handlePasswordChange('');
      passwordInput.focus();
    });
  }

  // Boot sequence
  initBackgroundCanvas();
  runPreloader();
})();

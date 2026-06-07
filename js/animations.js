/* ═══════════════════════════════════════════════════
   LER E EDUCAR — ANIMATIONS.JS (cursor removido)
═══════════════════════════════════════════════════ */

// ── 1. PARTÍCULAS ────────────────────────────────────
function initParticles(canvasId = 'particles-canvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const symbols = ['✦', '◆', '❧', '◈', '✿', '※'];
  const particles = Array.from({ length: 24 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight + innerHeight,
    size:     Math.random() * 12 + 5,
    speed:    Math.random() * .55 + .18,
    drift:    (Math.random() - .5) * .35,
    rot:      Math.random() * 360,
    rotSpeed: (Math.random() - .5) * .7,
    alpha:    Math.random() * .35 + .08,
    symbol:   symbols[Math.floor(Math.random() * symbols.length)]
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.globalAlpha = p.alpha;
      ctx.font = `${p.size}px serif`;
      ctx.fillStyle = `hsl(${25 + Math.random()*15}, 38%, 50%)`;
      ctx.fillText(p.symbol, 0, 0);
      ctx.restore();
      p.y   -= p.speed;
      p.x   += p.drift;
      p.rot += p.rotSpeed;
      if (p.y < -p.size * 2) {
        p.y = canvas.height + p.size;
        p.x = Math.random() * canvas.width;
      }
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ── 2. PARALLAX ──────────────────────────────────────
function initParallax(selector = '.bg-parallax', strength = 18) {
  const el = document.querySelector(selector);
  if (!el) return;
  window.addEventListener('mousemove', e => {
    const x = (e.clientX / innerWidth  - .5) * strength;
    const y = (e.clientY / innerHeight - .5) * strength;
    el.style.transform = `scale(1.1) translate(${x}px, ${y}px)`;
  });
  window.addEventListener('scroll', () => {
    el.style.transform = `scale(1.1) translateY(${scrollY * .28}px)`;
  });
}

// ── 3. TILT 3D ───────────────────────────────────────
function initTilt(selector = '.livro-card') {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - .5;
      const y = (e.clientY - r.top)  / r.height - .5;
      card.style.transition = 'transform .08s ease';
      card.style.transform  = `translateY(-7px) scale(1.02) rotateX(${-y*9}deg) rotateY(${x*9}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform .5s cubic-bezier(.25,.8,.25,1)';
      card.style.transform  = '';
    });
  });
}

// ── 4. RIPPLE ────────────────────────────────────────
function initRipple() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('button, .btn-login, .btn-reserva, .btn-salvar, .btn-add');
    if (!btn) return;
    const r    = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const wave = document.createElement('span');
    Object.assign(wave.style, {
      position: 'absolute',
      width: size + 'px', height: size + 'px',
      left: (e.clientX - r.left - size/2) + 'px',
      top:  (e.clientY - r.top  - size/2) + 'px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,.28)',
      transform: 'scale(0)',
      animation: 'ripple .55s linear',
      pointerEvents: 'none'
    });
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(wave);
    setTimeout(() => wave.remove(), 600);
  });
}

// ── 5. STAGGER ───────────────────────────────────────
function initStagger(selector = '.livro-card, .inst-card, .card-emprestimo, .item-livro, .livro-estoque') {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en, i) => {
      if (en.isIntersecting) {
        setTimeout(() => {
          en.target.style.animation = 'fadeUp .48s cubic-bezier(.25,.8,.25,1) both';
        }, i * 55);
        obs.unobserve(en.target);
      }
    });
  }, { threshold: .08 });
  document.querySelectorAll(selector).forEach(el => obs.observe(el));
}

// ── 6. HEADER SCROLL ─────────────────────────────────
function initHeaderScroll() {
  const h = document.querySelector('.header');
  if (!h) return;
  const fn = () => h.classList.toggle('scrolled', scrollY > 8);
  window.addEventListener('scroll', fn, { passive: true });
  fn();
}

// ── 7. PAGE LOAD ─────────────────────────────────────
function initPageLoad() {
  document.documentElement.style.opacity = '0';
  document.documentElement.style.transition = 'opacity .38s ease';
  const show = () => { document.documentElement.style.opacity = '1'; };
  if (document.readyState === 'complete') show();
  else { window.addEventListener('load', show); setTimeout(show, 600); }
}

// ── 8. TOAST ─────────────────────────────────────────
function showToast(msg, type = 'ok', ms = 3200) {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = Object.assign(document.createElement('div'), { id: 'toast-container' });
    Object.assign(c.style, { position:'fixed', bottom:'22px', right:'22px', zIndex:'9999', display:'flex', flexDirection:'column', gap:'8px' });
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  Object.assign(t.style, {
    background: type === 'ok' ? 'var(--primary-darker)' : '#c0392b',
    color: 'white', padding: '12px 20px', borderRadius: '12px',
    fontFamily: 'var(--font-body)', fontSize: '.88rem',
    boxShadow: '0 8px 24px rgba(0,0,0,.2)',
    borderLeft: `3px solid ${type === 'ok' ? 'var(--accent)' : '#e74c3c'}`,
    animation: 'fadeUp .3s both', maxWidth: '300px'
  });
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, ms);
}

// ── INIT ─────────────────────────────────────────────
function initAnimations(opts = {}) {
  const cfg = {
    pageLoad:     true,
    particles:    false,  // só no login
    parallax:     false,
    tilt:         true,
    ripple:       true,
    stagger:      true,
    headerScroll: true,
    cursor:       false,  // REMOVIDO
    ...opts
  };

  if (cfg.pageLoad)     initPageLoad();
  if (cfg.particles)    initParticles();
  if (cfg.parallax)     initParallax();
  if (cfg.tilt)         initTilt();
  if (cfg.ripple)       initRipple();
  if (cfg.stagger)      initStagger();
  if (cfg.headerScroll) initHeaderScroll();
  // cursor removido permanentemente
}
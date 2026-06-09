// ─── CONFIGURAÇÃO ───────────────────────────────────────────────
const API_BASE = 'https://ler-e-educar-api.onrender.com/api';

// ─── AUTH ────────────────────────────────────────────────────────
const Auth = {
  salvar(dados) {
    localStorage.setItem('token',           dados.token);
    localStorage.setItem('tipo',            dados.tipoUsuario);
    localStorage.setItem('nome',            dados.nome);
    localStorage.setItem('idUsuario',       dados.idUsuario);
    localStorage.setItem('nomeInstituicao', dados.nomeInstituicao || '');
    localStorage.setItem('idInstituicao',   dados.idInstituicao   || '');
  },
  token()          { return localStorage.getItem('token'); },
  tipo()           { return localStorage.getItem('tipo'); },
  nome()           { return localStorage.getItem('nome'); },
  nomeInstituicao(){ return localStorage.getItem('nomeInstituicao') || ''; },
  idInstituicao()  { return localStorage.getItem('idInstituicao')   || ''; },
  isAdmin()        { return Auth.tipo() === 'ADMINISTRADOR'; },
  logout() { localStorage.clear(); window.location.href = 'index.html'; },
  exigirLogin() { if (!Auth.token()) window.location.href = 'login.html'; },
  exibirNome() {
    ['nome-usuario-logado','adminName'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = Auth.nome() || 'Usuário';
    });
  }
};

// ─── FETCH GENÉRICO ──────────────────────────────────────────────
async function api(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && Auth.token()) headers['Authorization'] = 'Bearer ' + Auth.token();
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API_BASE + path, opts);
    if (res.status === 401) { Auth.logout(); return null; }
    if (res.status === 204) return {};
    return res.json();
  } catch (e) {
    console.error('Erro de rede:', e);
    return null;
  }
}

const get    = (path)        => api('GET',    path);
const post   = (path, body)  => api('POST',   path, body);
const patch  = (path, body)  => api('PATCH',  path, body || null);
const del    = (path)        => api('DELETE', path);

// ─── MAPEAMENTOS ─────────────────────────────────────────────────
const CATEGORIAS = {
  ALFABETIZACAO_LETRAMENTO: 'ALFABETIZAÇÃO E LETRAMENTO',
  CIENCIAS_NATUREZA:        'CIÊNCIAS DA NATUREZA',
  FABULAS:                  'FÁBULAS',
  CONTOS_DE_FADAS:          'CONTO DE FADAS',
  HISTORIA_CULTURA:         'HISTÓRIA E CULTURA',
  MATEMATICA:               'MATEMÁTICA',
  OUTRO:                    'OUTROS'
};

const SERIES = {
  PRIMEIRO_ANO: '1º Ano',
  SEGUNDO_ANO:  '2º Ano',
  TERCEIRO_ANO: '3º Ano',
  QUARTO_ANO:   '4º Ano',
  QUINTO_ANO:   '5º Ano'
};

// ─── HELPERS ─────────────────────────────────────────────────────
function formatarData(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR');
}
function debounce(fn, ms = 400) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ─── CAPAS DE LIVROS ─────────────────────────────────────────────
// Estratégia em cascata com throttle para evitar rate limiting:
//   1. URL salva no banco (instantâneo)
//   2. Open Library por ISBN
//   3. Open Library por título (evita 429 do Google Books)
//   4. Google Books como último recurso (com fila throttlada)
// ─────────────────────────────────────────────────────────────────
const CAPA_CACHE = {};

// Fila de requisições ao Google Books para evitar 429
const _gbQueue = [];
let _gbRunning = false;
async function _gbEnqueue(fn) {
  return new Promise((resolve) => {
    _gbQueue.push(() => fn().then(resolve));
    if (!_gbRunning) _gbDrain();
  });
}
async function _gbDrain() {
  _gbRunning = true;
  while (_gbQueue.length) {
    const task = _gbQueue.shift();
    await task();
    await new Promise(r => setTimeout(r, 400)); // 400ms entre requests
  }
  _gbRunning = false;
}

async function buscarCapa(livro) {
  const chave = livro.id || livro.titulo;
  if (CAPA_CACHE[chave] !== undefined) return CAPA_CACHE[chave];

  let url = null;

  // 1. URL salva no banco
  if (livro.imagemCapaUrl) {
    CAPA_CACHE[chave] = livro.imagemCapaUrl;
    return livro.imagemCapaUrl;
  }

  // 2. Open Library por ISBN (sem rate limit, rápido)
  if (livro.isbn) {
    const isbn = livro.isbn.replace(/[^0-9X]/gi, '');
    const candidato = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
    if (await checarImagemDimensao(candidato)) url = candidato;
  }

  // 3. Open Library por título (gratuito, sem rate limit)
  if (!url) url = await buscarCapaOpenLibrary(livro.titulo);

  // 4. Google Books via fila throttlada (último recurso)
  if (!url) {
    url = await _gbEnqueue(() => buscarCapaGoogleBooks(livro.titulo, livro.autor));
  }

  CAPA_CACHE[chave] = url;
  return url;
}

// Open Library por título — sem rate limit, ótima cobertura
async function buscarCapaOpenLibrary(titulo) {
  try {
    const q = encodeURIComponent(titulo);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://openlibrary.org/search.json?title=${q}&limit=5&fields=cover_i,title`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    for (const doc of (data.docs || [])) {
      if (doc.cover_i && doc.cover_i > 0) {
        const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
        if (await checarImagemDimensao(url)) return url;
      }
    }
  } catch { }
  return null;
}

// Google Books — com throttle via fila, evita 429
async function buscarCapaGoogleBooks(titulo, autor) {
  try {
    const q = encodeURIComponent(titulo + (autor ? ' ' + autor : ''));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3&printType=books`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    for (const item of (data.items || [])) {
      const thumb = item?.volumeInfo?.imageLinks?.thumbnail;
      if (thumb) return thumb.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
    }
  } catch { }
  return null;
}

// Verifica se imagem é real (> 1x1px)
function checarImagemDimensao(url) {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    const fim = (r) => { if (!done) { done = true; resolve(r); } };
    img.onload  = () => fim(img.naturalWidth > 1 && img.naturalHeight > 1);
    img.onerror = () => fim(false);
    setTimeout(() => fim(false), 6000);
    img.src = url;
  });
}

function capaHtml(url, titulo) {
  if (url) return `<img src="${url}" alt="${titulo}" style="width:100%;height:100%;object-fit:cover;">`;
  return `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2rem;opacity:.5">📖</div>`;
}

// ─── TOAST ───────────────────────────────────────────────────────
function showToast(msg, type = 'ok', ms = 3200) {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = Object.assign(document.createElement('div'), { id: 'toast-container' });
    Object.assign(c.style, {
      position:'fixed', bottom:'22px', right:'22px', zIndex:'9999',
      display:'flex', flexDirection:'column', gap:'8px'
    });
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  Object.assign(t.style, {
    background: type === 'ok' ? 'var(--primary-darker, #5a3f28)' : '#c0392b',
    color:'white', padding:'12px 20px', borderRadius:'12px',
    fontFamily:'var(--font-body, sans-serif)', fontSize:'.88rem',
    boxShadow:'0 8px 24px rgba(0,0,0,.2)',
    borderLeft:`3px solid ${type === 'ok' ? '#d4956a' : '#e74c3c'}`,
    maxWidth:'300px'
  });
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transition = 'opacity .3s';
    setTimeout(() => t.remove(), 300);
  }, ms);
}

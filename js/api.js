// ─── CONFIGURAÇÃO ───────────────────────────────────────────────
const API_BASE = 'https://ler-e-educar-api.onrender.com/api';

// ─── AUTH ────────────────────────────────────────────────────────
const Auth = {
  salvar(dados) {
    localStorage.setItem('token',     dados.token);
    localStorage.setItem('tipo',      dados.tipoUsuario);
    localStorage.setItem('nome',      dados.nome);
    localStorage.setItem('idUsuario', dados.idUsuario);
  },
  token()  { return localStorage.getItem('token'); },
  tipo()   { return localStorage.getItem('tipo'); },
  nome()   { return localStorage.getItem('nome'); },
  isAdmin(){ return Auth.tipo() === 'ADMINISTRADOR'; },
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

const STATUS_INST = {
  ATIVA:     { texto: 'Ativo',     classe: 'status-ATIVA' },
  PENDENTE:  { texto: 'Pendente',  classe: 'status-PENDENTE' },
  BLOQUEADA: { texto: 'Bloqueado', classe: 'status-BLOQUEADA' }
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

// ─── CAPAS (Open Library) ────────────────────────────────────────
const CAPA_CACHE = {};

async function buscarCapa(livro) {
  const chave = livro.isbn || livro.titulo;
  if (CAPA_CACHE[chave] !== undefined) return CAPA_CACHE[chave];

  let url = null;

  // 1. Tentar imagemCapaUrl salva no banco
  if (livro.imagemCapaUrl) {
    const ok = await verificarImagem(livro.imagemCapaUrl);
    if (ok) { CAPA_CACHE[chave] = livro.imagemCapaUrl; return livro.imagemCapaUrl; }
  }

  // 2. Tentar pelo ISBN via Open Library covers
  if (livro.isbn) {
    const isbn = livro.isbn.replace(/[^0-9X]/gi, '');
    const candidato = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
    const ok = await verificarImagemOpenLib(candidato);
    if (ok) { CAPA_CACHE[chave] = candidato; return candidato; }
  }

  // 3. Buscar cover_id pelo título via Search API
  try {
    const q = encodeURIComponent(livro.titulo);
    const res = await fetch(`https://openlibrary.org/search.json?title=${q}&limit=3`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      for (const doc of (data.docs || [])) {
        if (doc.cover_i) {
          url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
          const ok = await verificarImagemOpenLib(url);
          if (ok) break;
          url = null;
        }
      }
    }
  } catch { url = null; }

  CAPA_CACHE[chave] = url;
  return url;
}

// Verifica imagem por tamanho (Open Library retorna 1x1px quando não tem capa)
function verificarImagemOpenLib(url) {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    const finish = (result) => { if (!done) { done = true; resolve(result); } };
    img.onload  = () => finish(img.naturalWidth > 1 && img.naturalHeight > 1);
    img.onerror = () => finish(false);
    setTimeout(() => finish(false), 4000); // timeout de 4s
    img.src = url;
  });
}

// Verifica imagem genérica (URL salva no banco)
function verificarImagem(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img.naturalWidth > 1);
    img.onerror = () => resolve(false);
    setTimeout(() => resolve(false), 4000);
    img.src = url;
  });
}

function capaHtml(url, titulo) {
  if (url) return `<img src="${url}" alt="${titulo}" style="width:100%;height:100%;object-fit:cover;">`;
  return `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2rem">📖</div>`;
}

// ─── TOAST ───────────────────────────────────────────────────────
function showToast(msg, type = 'ok', ms = 3200) {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = Object.assign(document.createElement('div'), { id: 'toast-container' });
    Object.assign(c.style, { position:'fixed', bottom:'22px', right:'22px', zIndex:'9999', display:'flex', flexDirection:'column', gap:'8px' });
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  Object.assign(t.style, {
    background: type === 'ok' ? 'var(--primary-darker, #5a3f28)' : '#c0392b',
    color: 'white', padding: '12px 20px', borderRadius: '12px',
    fontFamily: 'var(--font-body, sans-serif)', fontSize: '.88rem',
    boxShadow: '0 8px 24px rgba(0,0,0,.2)',
    borderLeft: `3px solid ${type === 'ok' ? '#d4956a' : '#e74c3c'}`,
    animation: 'fadeUp .3s both', maxWidth: '300px'
  });
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, ms);
}
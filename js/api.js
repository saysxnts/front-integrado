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
  PENDENTE:  { texto: 'Pendente',  classe: 'status pendente' },
  ATIVO:     { texto: 'Ativo',     classe: 'status ativo'    },
  BLOQUEADO: { texto: 'Bloqueado', classe: 'status inativo'  }
};

// ─── HELPERS ────────────────────────────────────────────────────
function formatarData(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function debounce(fn, ms = 400) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ─── CAPAS DE LIVROS (Open Library) ─────────────────────────────
const CAPA_CACHE = {};

async function buscarCapa(livro) {
  const chave = livro.isbn || livro.titulo;
  if (CAPA_CACHE[chave]) return CAPA_CACHE[chave];

  let url = null;

  if (livro.isbn) {
    // Busca direta por ISBN — mais rápida e precisa
    url = `https://covers.openlibrary.org/b/isbn/${livro.isbn}-M.jpg`;
  } else {
    // Busca por título via API de busca
    try {
      const q = encodeURIComponent(livro.titulo);
      const res = await fetch(`https://openlibrary.org/search.json?title=${q}&limit=1`);
      const data = await res.json();
      const coverId = data?.docs?.[0]?.cover_i;
      if (coverId) url = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    } catch { url = null; }
  }

  // Verifica se a imagem existe de fato (Open Library retorna 1x1px para ISBN inválido)
  if (url) {
    const ok = await verificarImagem(url);
    url = ok ? url : null;
  }

  CAPA_CACHE[chave] = url;
  return url;
}

function verificarImagem(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img.width > 1 && img.height > 1);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function capaHtml(url, titulo, estilo = '') {
  if (url) {
    return `<img src="${url}" alt="Capa de ${titulo}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;${estilo}">`;
  }
  return `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:.75rem;color:#888;text-align:center;padding:4px">Capa não disponível</div>`;
}
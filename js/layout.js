/* ═══════════════════════════════════════════════════
   LER E EDUCAR — LAYOUT.JS (versão corrigida)
═══════════════════════════════════════════════════ */

function toggleMenu() {
  const menu = document.getElementById('menu-lateral');
  const btn  = document.querySelector('.menu-hamburguer');
  if (!menu) return;

  const aberto = menu.classList.toggle('aberto');
  if (btn) btn.classList.toggle('ativo', aberto);

  // Fechar ao clicar fora (uma vez só)
  if (aberto) {
    setTimeout(() => {
      document.addEventListener('click', _fecharMenuFora, { once: true });
    }, 10);
  }
}

function _fecharMenuFora(e) {
  const menu = document.getElementById('menu-lateral');
  const btn  = document.querySelector('.menu-hamburguer');
  if (!menu) return;
  if (!menu.contains(e.target) && btn && !btn.contains(e.target)) {
    menu.classList.remove('aberto');
    if (btn) btn.classList.remove('ativo');
  } else if (menu.classList.contains('aberto')) {
    // ainda aberto, re-registra
    document.addEventListener('click', _fecharMenuFora, { once: true });
  }
}

// Funções de compatibilidade
function expandirTexto() {
  const tc  = document.getElementById('texto-completo');
  const btn = document.getElementById('btn-ler-mais');
  if (!tc || !btn) return;
  const vis = tc.style.display === 'inline';
  tc.style.display  = vis ? 'none' : 'inline';
  btn.textContent   = vis ? '(Ver Mais)' : '(Ver Menos)';
}

function fecharModal() {
  const m = document.getElementById('modal-livro');
  if (m) m.style.display = 'none';
}

function mostrarAviso() {
  const a = document.getElementById('alertaCancelado');
  if (a) { a.style.display = 'flex'; setTimeout(() => a.style.display = 'none', 3000); }
}
function fecharAlerta() {
  const a = document.getElementById('alertaCancelado');
  if (a) a.style.display = 'none';
}
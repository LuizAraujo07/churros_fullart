/**
 * album.js — Lógica principal do Álbum de Cartas
 *
 * Conceitos:
 *  - 1800 cartas divididas em 100 páginas de 18 cartas cada
 *  - Cada página do site = 2 metades (lado A: cartas 1-9, lado B: cartas 10-18)
 *  - As divs/slots são criadas dinamicamente: apenas 18 elementos por vez no DOM
 *  - Ao mudar de página, os slots são reaproveitados (sem recriar tudo)
 */

// ─────────────────────────────────────────
// CONFIGURAÇÕES
// ─────────────────────────────────────────
const TOTAL_CARDS  = 1800;
const CARDS_PER_PAGE = 18;
const TOTAL_PAGES  = TOTAL_CARDS / CARDS_PER_PAGE; // 100
const CARDS_PER_SIDE = CARDS_PER_PAGE / 2;         // 9

// Usuários disponíveis (expanda conforme necessário)
const USERS = [
  { name: 'LUIZ',    emoji: '🔥' },
  { name: 'DANIEL', emoji: '⚡' },
  { name: 'OTÁRIO', emoji: '💧' },
];

// Ícones decorativos para os slots (rotacionam pelos slots)
const SLOT_ICONS = ['⬡', '◈', '✦', '⬟', '◆', '⊕', '✧', '◉', '⬢'];

// ─────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────
let currentPage = 1;
let currentUser = USERS[0];

// ─────────────────────────────────────────
// REFERÊNCIAS DOM
// ─────────────────────────────────────────
const gridLeft        = document.getElementById('grid-left');
const gridRight       = document.getElementById('grid-right');
const labelLeft       = document.getElementById('label-left');
const labelRight      = document.getElementById('label-right');
const curPageEl       = document.getElementById('cur-page');
const totalPagesEl    = document.getElementById('total-pages');
const rangeStartEl    = document.getElementById('range-start');
const rangeEndEl      = document.getElementById('range-end');
const pageJumpEl      = document.getElementById('page-jump');
const progressInner   = document.getElementById('progress-bar-inner');
const progressPct     = document.getElementById('progress-pct');
const currentUserEl   = document.getElementById('current-user');
const userListEl      = document.getElementById('user-list');

// ─────────────────────────────────────────
// RENDER DE PÁGINA
// ─────────────────────────────────────────

/**
 * Calcula o número global da primeira carta desta página.
 * Página 1 → carta 1; Página 2 → carta 19; etc.
 */
function firstCardOfPage(page) {
  return (page - 1) * CARDS_PER_PAGE + 1;
}

/**
 * Cria (ou reutiliza) 9 slots em um grid e atribui os números corretos.
 * @param {HTMLElement} grid   — elemento #grid-left ou #grid-right
 * @param {number}      start  — número da primeira carta deste lado
 */
function renderSide(grid, start) {
  // Reaproveitamos os filhos existentes para evitar reflow desnecessário
  let slots = Array.from(grid.children);

  // Cria slots faltantes (só acontece na primeira vez)
  while (slots.length < CARDS_PER_SIDE) {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    grid.appendChild(slot);
    slots.push(slot);
  }

  // Atualiza os dados de cada slot
  for (let i = 0; i < CARDS_PER_SIDE; i++) {
    const cardNum = start + i;
    const slot    = slots[i];
    const icon    = SLOT_ICONS[i % SLOT_ICONS.length];

    slot.innerHTML = `
      <span class="card-number">#${String(cardNum).padStart(4, '0')}</span>
      <span class="card-icon" aria-hidden="true">${icon}</span>
      <span class="card-badge">${cardNum}</span>
    `;

    // Remove listener antigo e adiciona novo
    slot.onclick = null;
    slot.onclick = () => openCardModal(cardNum);
  }
}

/**
 * Atualiza toda a visualização do álbum para `page`.
 */
function renderPage(page) {
  currentPage = Math.max(1, Math.min(page, TOTAL_PAGES));

  const firstCard  = firstCardOfPage(currentPage);
  const lastCard   = firstCard + CARDS_PER_PAGE - 1;
  const midCard    = firstCard + CARDS_PER_SIDE; // início do lado B

  // Grades
  renderSide(gridLeft,  firstCard);
  renderSide(gridRight, midCard);

  // Labels laterais
  labelLeft.textContent  = `LADO A  ·  #${String(firstCard).padStart(4,'0')} – #${String(midCard - 1).padStart(4,'0')}`;
  labelRight.textContent = `LADO B  ·  #${String(midCard).padStart(4,'0')} – #${String(lastCard).padStart(4,'0')}`;

  // Indicadores de navegação
  curPageEl.textContent    = currentPage;
  totalPagesEl.textContent = TOTAL_PAGES;
  rangeStartEl.textContent = firstCard;
  rangeEndEl.textContent   = lastCard;
  pageJumpEl.value         = currentPage;

  // Barra de progresso (baseada na página atual)
  const pct = Math.round((currentPage / TOTAL_PAGES) * 100);
  progressInner.style.width = pct + '%';
  progressPct.textContent   = pct + '%';
}

// ─────────────────────────────────────────
// MODAIS
// ─────────────────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function openCardModal(cardNum) {
  document.getElementById('card-modal-title').textContent =
    `CARTA  #${String(cardNum).padStart(4, '0')}`;
  openModal('card-modal');
}

// Fechar modal clicando no fundo
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });
});

document.getElementById('close-card-modal').onclick = () => closeModal('card-modal');
document.getElementById('close-user-modal').onclick = () => closeModal('user-modal');
document.getElementById('btn-confirm-user').onclick  = () => closeModal('user-modal');

// ─────────────────────────────────────────
// NAVEGAÇÃO
// ─────────────────────────────────────────

document.getElementById('btn-prev').onclick = () => {
  if (currentPage > 1) renderPage(currentPage - 1);
};

document.getElementById('btn-next').onclick = () => {
  if (currentPage < TOTAL_PAGES) renderPage(currentPage + 1);
};

document.getElementById('btn-go').onclick = () => {
  const val = parseInt(pageJumpEl.value, 10);
  if (!isNaN(val)) renderPage(val);
};

pageJumpEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-go').click();
});

// Atalhos de teclado: setas esquerda/direita
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT') return; // não interfere no campo de página
  if (e.key === 'ArrowLeft')  document.getElementById('btn-prev').click();
  if (e.key === 'ArrowRight') document.getElementById('btn-next').click();
});

// ─────────────────────────────────────────
// TROCA DE USUÁRIO
// ─────────────────────────────────────────

function buildUserList() {
  userListEl.innerHTML = '';
  USERS.forEach((user, idx) => {
    const li = document.createElement('li');
    li.className = user.name === currentUser.name ? 'active' : '';
    li.innerHTML = `<span class="user-avatar">${user.emoji}</span>${user.name}`;
    li.onclick = () => selectUser(idx);
    userListEl.appendChild(li);
  });
}

function selectUser(idx) {
  currentUser = USERS[idx];
  currentUserEl.textContent = currentUser.name;
  buildUserList(); // atualiza classe .active
}

document.getElementById('btn-change-user').onclick = () => {
  buildUserList();
  openModal('user-modal');
};

// ─────────────────────────────────────────
// ESTRELAS DECORATIVAS (pixel art background)
// ─────────────────────────────────────────

function createStars() {
  const container = document.getElementById('stars-container');
  const count = 60;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'px-star';
    star.style.cssText = `
      left: ${Math.random() * 100}vw;
      top:  ${Math.random() * 100}vh;
      --dur: ${2 + Math.random() * 4}s;
      --del: ${Math.random() * 4}s;
    `;
    container.appendChild(star);
  }
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────

(function init() {
  createStars();
  document.getElementById('total-pages').textContent = TOTAL_PAGES;
  renderPage(1);
})();

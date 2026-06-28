/**
 * album.js — Lógica principal do Álbum de Cartas
 *
 * Conceitos:
 *  - 1800 cartas divididas em 100 páginas de 18 cartas cada
 *  - Cada página do site = 2 metades (lado A: cartas 1-9, lado B: cartas 10-18)
 *  - As divs/slots são criadas dinamicamente: apenas 18 elementos por vez no DOM
 *  - Ao mudar de página, os slots são reaproveitados (sem recriar tudo)
 *  - Dados da Pokédex carregados do arquivo pokedex.csv (local)
 */

// ─────────────────────────────────────────
// CONFIGURAÇÕES
// ─────────────────────────────────────────
const TOTAL_CARDS    = 1800;
const CARDS_PER_PAGE = 18;
const TOTAL_PAGES    = TOTAL_CARDS / CARDS_PER_PAGE; // 100
const CARDS_PER_SIDE = CARDS_PER_PAGE / 2;           // 9

// ─────────────────────────────────────────
// POKÉDEX (carregada do CSV local)
// ─────────────────────────────────────────
let POKEDEX = {};

async function loadPokedex() {
  const res = await fetch('./pokedex.csv');

  if (!res.ok) {
    throw new Error(`Erro ao carregar pokedex.csv: ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const csvText = decodePokedexText(buffer);
  POKEDEX = parsePokedexCsv(csvText);
}

function decodePokedexText(buffer) {
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(buffer);
  }

  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(buffer);
  }

  return new TextDecoder('utf-8').decode(buffer);
}

function parsePokedexCsv(csvText) {
  const rows = parseDelimitedRows(csvText.trim());
  const headers = rows.shift().map(header => header.replace(/^\uFEFF/, ''));

  return rows.reduce((pokedex, values) => {
    const row = headers.reduce((data, header, index) => {
      data[header] = values[index] ?? '';
      return data;
    }, {});

    const number = Number(row.national_number);
    if (!number) return pokedex;

    pokedex[String(number)] = {
      number,
      name: row.english_name,
      gen: row.gen,
      type1: row.primary_type,
      type2: row.secondary_type || null,
      classification: row.classification,
      description: row.description,
    };

    return pokedex;
  }, {});
}

function parseDelimitedRows(text) {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  const rows = [];
  let row = [];
  let value = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      value += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value);
  rows.push(row);

  return rows.filter(values => values.some(item => item !== ''));
}

function getPokemon(cardNum) {
  return POKEDEX[String(cardNum)] ?? null;
}

// ─────────────────────────────────────────
// USUÁRIOS
// ─────────────────────────────────────────
const USERS = [
  { name: 'LUIZ',    emoji: '🔥' },
  { name: 'DANIEL',  emoji: '⚡' },
  { name: 'OTÁRIO',  emoji: '💧' },
];

const SLOT_ICONS = ['⬡', '◈', '✦', '⬟', '◆', '⊕', '✧', '◉', '⬢'];

// ─────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────
let currentPage = 1;
let currentUser = USERS[0];

// ─────────────────────────────────────────
// REFERÊNCIAS DOM
// ─────────────────────────────────────────
const gridLeft       = document.getElementById('grid-left');
const gridRight      = document.getElementById('grid-right');
const labelLeft      = document.getElementById('label-left');
const labelRight     = document.getElementById('label-right');
const curPageEl      = document.getElementById('cur-page');
const totalPagesEl   = document.getElementById('total-pages');
const rangeStartEl   = document.getElementById('range-start');
const rangeEndEl     = document.getElementById('range-end');
const pageJumpEl     = document.getElementById('page-jump');
const progressInner  = document.getElementById('progress-bar-inner');
const progressPct    = document.getElementById('progress-pct');
const currentUserEl  = document.getElementById('current-user');
const userListEl     = document.getElementById('user-list');

// ─────────────────────────────────────────
// RENDER DE PÁGINA
// ─────────────────────────────────────────

function firstCardOfPage(page) {
  return (page - 1) * CARDS_PER_PAGE + 1;
}

function renderSide(grid, start) {
  while (grid.children.length < CARDS_PER_SIDE) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-wrapper';
    wrapper.innerHTML = `
      <div class="card-slot"></div>
      <div class="card-label"></div>
    `;
    grid.appendChild(wrapper);
  }

  const wrappers = Array.from(grid.children);

  for (let i = 0; i < CARDS_PER_SIDE; i++) {
    const cardNum = start + i;
    const wrapper = wrappers[i];
    const slot    = wrapper.querySelector('.card-slot');
    const label   = wrapper.querySelector('.card-label');
    const icon    = SLOT_ICONS[i % SLOT_ICONS.length];
    const pokemon = getPokemon(cardNum);

    slot.innerHTML = `
      <span class="card-number">#${String(cardNum).padStart(4, '0')}</span>
      <span class="card-icon" aria-hidden="true">${icon}</span>
    `;

    if (pokemon) {
      label.innerHTML = `
        <span class="label-num">#${String(pokemon.number).padStart(4, '0')}</span>
        <span class="label-name">${pokemon.name}</span>
      `;
      label.classList.remove('label-empty');
    } else {
      label.innerHTML = `<span class="label-unknown">???</span>`;
      label.classList.add('label-empty');
    }

    wrapper.onclick = null;
    wrapper.onclick = () => openCardModal(cardNum);
  }
}

function renderPage(page) {
  currentPage = Math.max(1, Math.min(page, TOTAL_PAGES));

  const firstCard = firstCardOfPage(currentPage);
  const lastCard  = firstCard + CARDS_PER_PAGE - 1;
  const midCard   = firstCard + CARDS_PER_SIDE;

  renderSide(gridLeft,  firstCard);
  renderSide(gridRight, midCard);

  labelLeft.textContent  = `LADO A  ·  #${String(firstCard).padStart(4,'0')} – #${String(midCard - 1).padStart(4,'0')}`;
  labelRight.textContent = `LADO B  ·  #${String(midCard).padStart(4,'0')} – #${String(lastCard).padStart(4,'0')}`;

  curPageEl.textContent    = currentPage;
  totalPagesEl.textContent = TOTAL_PAGES;
  rangeStartEl.textContent = firstCard;
  rangeEndEl.textContent   = lastCard;
  pageJumpEl.value         = currentPage;

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
  const pokemon = getPokemon(cardNum);

  document.getElementById('card-modal-title').textContent =
    `CARTA  #${String(cardNum).padStart(4, '0')}`;

  const infoEl = document.getElementById('card-pokemon-info');

  if (pokemon) {
    infoEl.innerHTML = `
      <div class="poke-info-row">
        <span class="poke-info-label">Nº</span>
        <span class="poke-info-value poke-number">#${String(pokemon.number).padStart(4, '0')}</span>
      </div>
      <div class="poke-info-row">
        <span class="poke-info-label">NOME</span>
        <span class="poke-info-value poke-name">${pokemon.name}</span>
      </div>
      <div class="poke-info-row">
        <span class="poke-info-label">GEN</span>
        <span class="poke-info-value poke-gen">GEN ${pokemon.gen}</span>
      </div>
      <div class="poke-info-row">
        <span class="poke-info-label">TIPO</span>
        <span class="poke-info-value poke-type">${pokemon.type1}${pokemon.type2 ? ' / ' + pokemon.type2 : ''}</span>
      </div>
    `;
  } else {
    infoEl.innerHTML = `
      <div class="poke-not-found">
        <span>???</span>
        <small>Pokémon não encontrado</small>
      </div>
    `;
  }

  openModal('card-modal');
}

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

document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT') return;
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
  buildUserList();
}

document.getElementById('btn-change-user').onclick = () => {
  buildUserList();
  openModal('user-modal');
};

// ─────────────────────────────────────────
// ESTRELAS DECORATIVAS
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

(async function init() {
  createStars();
  document.getElementById('total-pages').textContent = TOTAL_PAGES;

  try {
    await loadPokedex();
  } catch (error) {
    console.error(error);
  }

  renderPage(1);
})();

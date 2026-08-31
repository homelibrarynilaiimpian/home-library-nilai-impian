import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const HLNI_SUPABASE_URL = 'https://hpkzlioltmzyoalnqhgz.supabase.co';
const HLNI_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_57JvYsgIIi1LDnMYkew7XA_mOrQaZu2';

const visitorDb = createClient(HLNI_SUPABASE_URL, HLNI_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Uses the same auth storage as the existing family app, without replacing its main client.
const familyDb = createClient(HLNI_SUPABASE_URL, HLNI_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'hlni-auth-v1'
  }
});

const STYLE_ID = 'hlni-v8-5-styles';

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* ---------- Searchable LCC selector ---------- */
    .hlni-category-search {
      position: relative;
      display: grid;
      gap: 8px;
      grid-column: 1 / -1;
      margin-top: -2px;
      margin-bottom: 2px;
    }

    .hlni-category-search-input {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .hlni-category-results {
      position: absolute;
      z-index: 1500;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      max-height: 280px;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      background: #fffdf8;
      border: 1px solid rgba(31, 59, 50, .16);
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(23, 42, 36, .16);
      padding: 6px;
    }

    .hlni-category-results[hidden] { display: none !important; }

    .hlni-category-option {
      display: block;
      width: 100%;
      border: 0;
      background: transparent;
      color: #203b33;
      border-radius: 10px;
      padding: 11px;
      text-align: left;
      font: inherit;
      font-size: 13px;
      line-height: 1.35;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .hlni-category-option:hover,
    .hlni-category-option:focus-visible {
      background: rgba(184, 145, 69, .11);
      outline: none;
    }

    .hlni-category-empty {
      padding: 11px;
      color: #6f746f;
      font-size: 12px;
    }

    /* ---------- Public visitor ticker ---------- */
    .hlni-visitor-ticker {
      overflow: hidden;
      min-height: 22px;
      margin: 2px 0 8px;
      color: #5d6d66;
      font-size: 12px !important;
      line-height: 22px !important;
      letter-spacing: .01em;
      white-space: nowrap;
    }

    .hlni-visitor-ticker[hidden] { display: none !important; }

    .hlni-visitor-ticker-track {
      display: inline-block;
      min-width: max-content;
      padding-left: 100%;
      will-change: transform;
      animation: hlniVisitorTicker 18s linear infinite !important;
    }

    .hlni-visitor-ticker strong {
      color: #28463c;
      font-weight: 750;
    }

    @keyframes hlniVisitorTicker {
      from { transform: translateX(0); }
      to { transform: translateX(-100%); }
    }

    /* ---------- Clickable statistic cards ---------- */
    .hlni-stat-shortcut {
      position: relative;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: rgba(184, 145, 69, .12);
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }

    .hlni-stat-shortcut::after {
      content: '›';
      position: absolute;
      right: 14px;
      bottom: 11px;
      color: rgba(31, 59, 50, .42);
      font-size: 18px;
      font-weight: 400;
      line-height: 1;
      pointer-events: none;
    }

    @media (hover:hover) {
      .hlni-stat-shortcut:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(31, 59, 50, .08);
        border-color: rgba(184, 145, 69, .34);
      }
    }

    .hlni-stat-shortcut:active {
      transform: translateY(1px) scale(.995);
    }

    .hlni-stat-shortcut:focus-visible {
      outline: 2px solid rgba(184, 145, 69, .72);
      outline-offset: 3px;
    }

    /* ---------- Public category destination ---------- */
    .hlni-public-category-panel {
      margin: 0 0 18px;
      padding: 18px;
      border: 1px solid rgba(31, 59, 50, .13);
      border-radius: 18px;
      background: #fffdf8;
      box-shadow: 0 8px 24px rgba(31, 59, 50, .045);
    }

    .hlni-public-category-panel[hidden] { display: none !important; }

    .hlni-public-category-panel h2 {
      margin: 0 0 4px;
      color: #1f3b32;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 600;
    }

    .hlni-public-category-panel p {
      margin: 0 0 14px;
      color: #69726d;
      font-size: 13px;
      line-height: 1.55;
    }

    .hlni-public-category-panel input {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 12px;
    }

    .hlni-public-category-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 7px;
      max-height: 390px;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      padding-right: 2px;
    }

    .hlni-public-category-button {
      border: 1px solid rgba(31, 59, 50, .11);
      border-radius: 12px;
      background: #fffaf1;
      color: #28463c;
      padding: 10px 12px;
      text-align: left;
      font: inherit;
      font-size: 12.5px;
      line-height: 1.35;
      cursor: pointer;
      transition: transform .16s ease, border-color .16s ease, background .16s ease;
    }

    @media (hover:hover) {
      .hlni-public-category-button:hover {
        transform: translateY(-1px);
        border-color: rgba(184, 145, 69, .42);
        background: #fffdf8;
      }
    }

    .hlni-public-category-button:active { transform: translateY(1px); }
    .hlni-public-category-button:focus-visible {
      outline: 2px solid rgba(184, 145, 69, .7);
      outline-offset: 2px;
    }

    .hlni-public-category-count {
      display: block;
      margin-top: 8px;
      color: #7b817d;
      font-size: 11.5px;
    }

    /* ---------- Family shortcut destination views ---------- */
    .hlni-family-shortcut-view {
      width: 100%;
    }

    .hlni-family-shortcut-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 16px;
    }

    .hlni-family-shortcut-head .eyebrow { margin-bottom: 5px; }
    .hlni-family-shortcut-head h3 {
      margin: 0;
      color: #1f3b32;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: clamp(24px, 5vw, 34px);
      font-weight: 600;
    }

    .hlni-family-back {
      flex: 0 0 auto;
      border: 1px solid rgba(31, 59, 50, .14);
      border-radius: 999px;
      background: #fffdf8;
      color: #28463c;
      padding: 8px 12px;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .hlni-family-back:focus-visible {
      outline: 2px solid rgba(184, 145, 69, .72);
      outline-offset: 2px;
    }

    .hlni-family-shortcut-meta {
      margin: -5px 0 14px;
      color: #6f7772;
      font-size: 12.5px;
    }

    .hlni-family-shortcut-list {
      display: grid;
      gap: 11px;
    }

    .hlni-family-reading-card,
    .hlni-family-work-card {
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr);
      gap: 13px;
      align-items: start;
      padding: 13px;
      border: 1px solid rgba(31, 59, 50, .12);
      border-radius: 16px;
      background: #fffdf8;
      box-shadow: 0 6px 18px rgba(31, 59, 50, .035);
    }

    .hlni-family-shortcut-cover {
      width: 64px;
      aspect-ratio: 2 / 3;
      object-fit: cover;
      border-radius: 8px;
      background: #efe8d8;
      color: #395247;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 700;
      overflow: hidden;
    }

    .hlni-family-shortcut-main { min-width: 0; }
    .hlni-family-shortcut-title {
      margin: 0;
      color: #203b33;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 17px;
      line-height: 1.25;
      font-weight: 600;
    }

    .hlni-family-shortcut-author {
      margin: 4px 0 9px;
      color: #717873;
      font-size: 12px;
      line-height: 1.4;
    }

    .hlni-family-reader-summary {
      margin: 0;
      color: #334c43;
      font-size: 12.5px;
      line-height: 1.5;
    }

    .hlni-family-reader-records {
      display: grid;
      gap: 8px;
      margin-top: 8px;
    }

    .hlni-family-reader-record {
      padding-top: 8px;
      border-top: 1px solid rgba(31, 59, 50, .09);
    }

    .hlni-family-reader-line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 9px;
      color: #2d463d;
      font-size: 12px;
    }

    .hlni-family-reader-line .stars {
      color: #9a742f;
      letter-spacing: .02em;
    }

    .hlni-family-review-text {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
      margin: 5px 0 0;
      color: #656d68;
      font-size: 12px;
      line-height: 1.5;
    }

    .hlni-family-work-meta {
      margin-top: 6px;
      color: #6d756f;
      font-size: 12px;
    }

    .hlni-family-empty {
      padding: 22px;
      border: 1px solid rgba(31, 59, 50, .11);
      border-radius: 16px;
      background: #fffdf8;
      color: #727a75;
      font-size: 13px;
      text-align: center;
    }

    @media (max-width: 620px) {
      .hlni-stat-shortcut::after { right: 10px; bottom: 9px; font-size: 16px; }
      .hlni-public-category-panel { padding: 14px; border-radius: 16px; }
      .hlni-public-category-list { grid-template-columns: 1fr; max-height: 330px; }
      .hlni-family-reading-card,
      .hlni-family-work-card { grid-template-columns: 56px minmax(0, 1fr); padding: 11px; }
      .hlni-family-shortcut-cover { width: 56px; }
      .hlni-family-shortcut-title { font-size: 16px; }
    }
  `;
  document.head.appendChild(style);
}

function normalizeSearch(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function optionCode(text = '') {
  return String(text).match(/\(([A-Z]{1,3})\)\s*(?:\(\d+\))?\s*$/)?.[1]
    || String(text).match(/\(([A-Z]{1,3})\)/)?.[1]
    || '';
}

/* ========================================================================== */
/* Searchable LCC                                                            */
/* ========================================================================== */

function enhanceCategorySelect(select) {
  if (!select || select.dataset.hlniSearchEnhanced === '1') return;
  select.dataset.hlniSearchEnhanced = '1';

  // Keep the native selector visible as a reliable fallback on iPhone/Safari.
  const wrap = document.createElement('div');
  wrap.className = 'hlni-category-search full';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'hlni-category-search-input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = 'Cari kategori manual — contoh PQ, Matematik, Islam…';
  input.setAttribute('aria-label', 'Cari kategori LCC secara manual');
  input.setAttribute('aria-expanded', 'false');

  const results = document.createElement('div');
  results.className = 'hlni-category-results';
  results.hidden = true;

  wrap.append(input, results);

  const categoryLabel = select.closest('label.category-control') || select.parentElement;
  categoryLabel.insertAdjacentElement('afterend', wrap);

  const getOptions = () => [...select.options]
    .filter(option => option.value && option.value !== 'AUTO')
    .map(option => ({
      value: option.value,
      text: option.textContent.trim(),
      code: optionCode(option.textContent.trim())
    }));

  function closeResults() {
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  function syncFromSelect() {
    const selected = select.options[select.selectedIndex];
    const isAuto = !selected || select.value === 'AUTO';
    if (isAuto) {
      if (document.activeElement !== input) input.value = '';
    } else if (document.activeElement !== input || !input.value.trim()) {
      input.value = selected?.textContent?.trim() || '';
    }
  }

  function choose(value) {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    syncFromSelect();
    closeResults();
  }

  function renderResults(query = '') {
    const q = normalizeSearch(query);
    const ranked = getOptions()
      .map(item => {
        const text = normalizeSearch(item.text);
        const code = normalizeSearch(item.code);
        let rank = 9;
        if (!q) rank = 5;
        else if (code === q) rank = 0;
        else if (code.startsWith(q)) rank = 1;
        else if (text.startsWith(q)) rank = 2;
        else if (text.includes(q)) rank = 3;
        return { ...item, rank };
      })
      .filter(item => !q || item.rank < 9)
      .sort((a, b) => a.rank - b.rank || a.text.localeCompare(b.text, 'ms-MY'))
      .slice(0, 18);

    results.replaceChildren();
    if (!ranked.length) {
      const empty = document.createElement('div');
      empty.className = 'hlni-category-empty';
      empty.textContent = getOptions().length
        ? 'Tiada kategori yang sepadan.'
        : 'Kategori sedang dimuatkan. Cuba lagi sebentar.';
      results.appendChild(empty);
    } else {
      ranked.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hlni-category-option';
        button.textContent = item.text;
        button.addEventListener('pointerdown', event => event.preventDefault());
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          choose(item.value);
        });
        results.appendChild(button);
      });
    }
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  input.addEventListener('focus', () => {
    if (select.value !== 'AUTO' && input.value) input.select();
    renderResults(input.value);
  });
  input.addEventListener('input', () => renderResults(input.value));
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeResults();
      input.blur();
    }
  });

  select.addEventListener('change', () => {
    syncFromSelect();
    closeResults();
  });
  select.form?.addEventListener('reset', () => setTimeout(() => {
    syncFromSelect();
    closeResults();
  }, 0));

  new MutationObserver(() => {
    setTimeout(() => {
      syncFromSelect();
      if (document.activeElement === input) renderResults(input.value);
    }, 0);
  }).observe(select, { childList: true, subtree: true });

  const editDialog = select.closest('dialog');
  if (editDialog) {
    new MutationObserver(() => {
      if (editDialog.open) setTimeout(syncFromSelect, 0);
    }).observe(editDialog, { attributes: true, attributeFilter: ['open'] });
  }

  document.addEventListener('pointerdown', event => {
    if (!wrap.contains(event.target)) closeResults();
  });

  syncFromSelect();
}

function initCategorySearch() {
  document
    .querySelectorAll('#add-book-form select[name="category_mode"], #edit-book-form select[name="category_mode"]')
    .forEach(enhanceCategorySelect);
}

/* ========================================================================== */
/* Public visitor ticker                                                      */
/* ========================================================================== */

function uuidV4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

function persistentVisitorId() {
  const key = 'hlni-public-visitor-v1';
  const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  try {
    let id = localStorage.getItem(key);
    if (!validUuid.test(id || '')) {
      id = uuidV4();
      localStorage.setItem(key, id);
    }
    return localStorage.getItem(key) === id ? id : null;
  } catch (_) {
    return null;
  }
}

async function initVisitorTicker() {
  const header = document.querySelector('.public-header-v8');
  if (!header || document.getElementById('hlni-visitor-ticker')) return;

  const ticker = document.createElement('div');
  ticker.id = 'hlni-visitor-ticker';
  ticker.className = 'hlni-visitor-ticker';
  ticker.hidden = true;
  ticker.setAttribute('aria-label', 'Bilangan pelawat laman');

  const track = document.createElement('span');
  track.className = 'hlni-visitor-ticker-track';
  ticker.appendChild(track);
  header.insertAdjacentElement('afterend', ticker);

  try {
    const id = persistentVisitorId();
    const { data, error } = id
      ? await visitorDb.rpc('register_public_visitor', { p_visitor_id: id })
      : await visitorDb.rpc('public_visitor_count');
    if (error) throw error;

    const count = Number(data || 0);
    const strong = document.createElement('strong');
    strong.textContent = `${count.toLocaleString('ms-MY')} Pelawat`;
    track.replaceChildren(strong, document.createTextNode(' · Sejak 31 Ogos 2026'));
    ticker.hidden = false;
  } catch (error) {
    console.warn('[HLNI] Visitor counter belum tersedia.', error);
  }
}

/* ========================================================================== */
/* Shared statistic-card interaction                                          */
/* ========================================================================== */

function makeStatShortcut(card, ariaLabel, handler) {
  if (!card || card.dataset.hlniStatShortcut === '1') return;
  card.dataset.hlniStatShortcut = '1';
  card.classList.add('hlni-stat-shortcut');
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', ariaLabel);
  card.addEventListener('click', handler);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  });
}

/* ========================================================================== */
/* PUBLIC SITE: statistic shortcuts                                           */
/* ========================================================================== */

function setPublicCatalogueAll() {
  document.querySelector('[data-public-view="catalogue"]')?.click();

  const search = document.getElementById('public-search');
  if (search && search.value) {
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const category = document.getElementById('public-category');
  if (category && category.value) {
    category.value = '';
    category.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function ensurePublicCategoryPanel() {
  const catalogue = document.getElementById('public-view-catalogue');
  const searchPanel = catalogue?.querySelector('.public-search-panel');
  const select = document.getElementById('public-category');
  if (!catalogue || !searchPanel || !select) return null;

  let panel = document.getElementById('hlni-public-category-panel');
  if (panel) return panel;

  panel = document.createElement('section');
  panel.id = 'hlni-public-category-panel';
  panel.className = 'hlni-public-category-panel';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'hlni-public-category-title');
  panel.innerHTML = `
    <h2 id="hlni-public-category-title" tabindex="-1">Kategori</h2>
    <p>Pilih kategori untuk melihat buku dalam koleksi.</p>
    <input id="hlni-public-category-search" type="search" autocomplete="off" placeholder="Cari kategori atau kod LCC…" aria-label="Cari kategori koleksi">
    <div id="hlni-public-category-list" class="hlni-public-category-list"></div>
    <span id="hlni-public-category-count" class="hlni-public-category-count"></span>
  `;
  searchPanel.insertAdjacentElement('beforebegin', panel);

  const input = panel.querySelector('#hlni-public-category-search');
  const list = panel.querySelector('#hlni-public-category-list');
  const count = panel.querySelector('#hlni-public-category-count');

  function options() {
    return [...select.options]
      .filter(option => option.value)
      .map(option => ({ value: option.value, text: option.textContent.trim(), code: optionCode(option.textContent.trim()) }));
  }

  function render() {
    const q = normalizeSearch(input.value);
    const rows = options().filter(item => {
      if (!q) return true;
      return normalizeSearch(item.text).includes(q) || normalizeSearch(item.code).includes(q);
    });
    list.innerHTML = rows.length
      ? rows.map(item => `<button type="button" class="hlni-public-category-button" data-hlni-public-category="${escapeHtml(item.value)}">${escapeHtml(item.text)}</button>`).join('')
      : '<div class="hlni-category-empty">Tiada kategori yang sepadan.</div>';
    count.textContent = `${rows.length.toLocaleString('ms-MY')} kategori`;

    list.querySelectorAll('[data-hlni-public-category]').forEach(button => {
      button.addEventListener('click', () => {
        select.value = button.dataset.hlniPublicCategory || '';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        panel.hidden = true;
        document.getElementById('public-meta')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  input.addEventListener('input', render);
  new MutationObserver(render).observe(select, { childList: true, subtree: true });
  render();
  return panel;
}

function showPublicCategories() {
  setPublicCatalogueAll();
  const panel = ensurePublicCategoryPanel();
  if (!panel) return;
  panel.hidden = false;
  const search = panel.querySelector('#hlni-public-category-search');
  if (search) search.value = '';
  search?.dispatchEvent(new Event('input', { bubbles: true }));
  setTimeout(() => {
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    panel.querySelector('#hlni-public-category-title')?.focus({ preventScroll: true });
  }, 60);
}

function hidePublicCategoryPanel() {
  const panel = document.getElementById('hlni-public-category-panel');
  if (panel) panel.hidden = true;
}

function initPublicStatShortcuts() {
  const stats = document.querySelector('.public-stats-v8');
  if (!stats) return;

  const titleCard = document.getElementById('public-stat-titles')?.closest('.stat-card');
  const categoryCard = document.getElementById('public-stat-categories')?.closest('.stat-card');
  const readCard = document.getElementById('public-stat-reads')?.closest('.stat-card');
  const worksCard = document.getElementById('public-stat-family-works')?.closest('.stat-card');

  makeStatShortcut(titleCard, 'Buka semua judul dalam Katalog', () => {
    hidePublicCategoryPanel();
    setPublicCatalogueAll();
    setTimeout(() => document.getElementById('public-section-nav')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  });

  makeStatShortcut(categoryCard, 'Buka senarai kategori koleksi', showPublicCategories);

  makeStatShortcut(readCard, 'Buka Ulasan Buku', () => {
    hidePublicCategoryPanel();
    document.querySelector('[data-public-view="reviews"]')?.click();
    setTimeout(() => document.getElementById('public-section-nav')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  });

  makeStatShortcut(worksCard, 'Buka Karya Keluarga', () => {
    hidePublicCategoryPanel();
    document.querySelector('[data-public-view="familyworks"]')?.click();
    setTimeout(() => document.getElementById('public-section-nav')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  });

  document.querySelectorAll('[data-public-view]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.publicView !== 'catalogue') hidePublicCategoryPanel();
    });
  });
}

/* ========================================================================== */
/* FAMILY / PRIVATE: statistic shortcuts and operational lists                */
/* ========================================================================== */

let familyStatExpected = null;
let familyStatsRefreshTimer = null;

function familyAuthorNames(book) {
  const names = (book?.book_authors || []).map(item => item?.author?.name).filter(Boolean);
  return names.length ? names.join(', ') : 'Penulis tidak direkod';
}

function familyCover(book) {
  return book?.cover_url
    ? `<img class="hlni-family-shortcut-cover" src="${escapeHtml(book.cover_url)}" alt="" loading="lazy">`
    : '<div class="hlni-family-shortcut-cover">HLNI</div>';
}

function familyStars(rating) {
  if (!rating) return '';
  const n = Math.max(1, Math.min(5, Math.round(Number(rating))));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function setFamilyStatLabels() {
  const cards = [...document.querySelectorAll('#view-home .stats-grid-four .stat-card')];
  if (cards.length < 4) return;
  const labels = ['Judul', 'Sedang Dibaca', 'Selesai Dibaca', 'Karya Keluarga'];
  cards.slice(0, 4).forEach((card, index) => {
    const label = card.querySelector('.stat-label');
    if (label && label.textContent !== labels[index]) label.textContent = labels[index];
    card.classList.add('public-stat-card');
  });
}

function applyFamilyStatExpected() {
  if (!familyStatExpected) return;
  const mapping = [
    ['stat-copies', familyStatExpected.reading],
    ['stat-available', familyStatExpected.read],
    ['stat-read', familyStatExpected.works]
  ];
  mapping.forEach(([id, value]) => {
    const el = document.getElementById(id);
    const text = Number(value || 0).toLocaleString('ms-MY');
    if (el && el.textContent !== text) el.textContent = text;
  });
}

async function hasFamilySession() {
  try {
    const { data } = await familyDb.auth.getSession();
    return Boolean(data?.session);
  } catch {
    return false;
  }
}

async function refreshFamilyStats() {
  const shell = document.getElementById('app-shell');
  if (!shell || shell.classList.contains('hidden')) return;
  if (!(await hasFamilySession())) return;

  try {
    const [reviewsRes, worksRes] = await Promise.all([
      familyDb.from('book_reviews').select('book_id,reading_status').in('reading_status', ['READING', 'READ']),
      familyDb.from('books').select('id', { count: 'exact', head: true }).eq('is_family_work', true).is('archived_at', null)
    ]);
    if (reviewsRes.error) throw reviewsRes.error;
    if (worksRes.error) throw worksRes.error;

    const reviewRows = reviewsRes.data || [];
    familyStatExpected = {
      reading: reviewRows.filter(row => row.reading_status === 'READING').length,
      read: reviewRows.filter(row => row.reading_status === 'READ').length,
      works: Number(worksRes.count || 0)
    };
    setFamilyStatLabels();
    applyFamilyStatExpected();
  } catch (error) {
    console.warn('[HLNI] Family statistic shortcuts could not refresh.', error);
  }
}

function scheduleFamilyStatsRefresh(delay = 350) {
  clearTimeout(familyStatsRefreshTimer);
  familyStatsRefreshTimer = setTimeout(refreshFamilyStats, delay);
}

function ensureFamilyShortcutView() {
  const main = document.querySelector('.main-content');
  if (!main) return null;
  let view = document.getElementById('hlni-family-shortcut-view');
  if (view) return view;

  view = document.createElement('section');
  view.id = 'hlni-family-shortcut-view';
  view.className = 'view hidden hlni-family-shortcut-view';
  view.innerHTML = `
    <div class="hlni-family-shortcut-head">
      <div>
        <p id="hlni-family-shortcut-eyebrow" class="eyebrow">BACAAN KELUARGA</p>
        <h3 id="hlni-family-shortcut-title">Bacaan Keluarga</h3>
      </div>
      <button id="hlni-family-shortcut-back" class="hlni-family-back" type="button">← Home</button>
    </div>
    <p id="hlni-family-shortcut-meta" class="hlni-family-shortcut-meta"></p>
    <div id="hlni-family-shortcut-list" class="hlni-family-shortcut-list"></div>
  `;
  main.appendChild(view);
  view.querySelector('#hlni-family-shortcut-back')?.addEventListener('click', () => {
    document.querySelector('.nav-btn[data-nav="home"]')?.click();
  });
  return view;
}

function showFamilyShortcutShell(mode) {
  const view = ensureFamilyShortcutView();
  if (!view) return null;

  document.querySelectorAll('.main-content > .view').forEach(section => section.classList.add('hidden'));
  view.classList.remove('hidden');

  const pageTitle = document.getElementById('page-title');
  const title = view.querySelector('#hlni-family-shortcut-title');
  const eyebrow = view.querySelector('#hlni-family-shortcut-eyebrow');
  const meta = view.querySelector('#hlni-family-shortcut-meta');
  const list = view.querySelector('#hlni-family-shortcut-list');

  const config = {
    reading: { page: 'Sedang Dibaca', eyebrow: 'BACAAN KELUARGA', nav: 'reading' },
    read: { page: 'Sejarah Bacaan Keluarga', eyebrow: 'SELESAI DIBACA', nav: 'reading' },
    works: { page: 'Karya Keluarga', eyebrow: 'KOLEKSI KELUARGA', nav: 'catalogue' }
  }[mode];

  if (!config) return null;
  if (pageTitle) pageTitle.textContent = config.page;
  if (title) title.textContent = config.page;
  if (eyebrow) eyebrow.textContent = config.eyebrow;
  if (meta) meta.textContent = 'Memuatkan…';
  if (list) list.innerHTML = '<div class="hlni-family-empty">Memuatkan rekod…</div>';

  document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.nav === config.nav));
  history.replaceState(null, '', `#hlni-${mode}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return { view, meta, list };
}

function groupFamilyReadingRows(rows) {
  const groups = new Map();
  (rows || []).forEach(row => {
    const book = row.book;
    if (!book?.id) return;
    if (!groups.has(book.id)) groups.set(book.id, { book, records: [] });
    groups.get(book.id).records.push(row);
  });
  return [...groups.values()];
}

function familyReadingCard(group, mode) {
  const { book, records } = group;
  const names = [...new Set(records.map(row => row.reviewer?.display_name || 'Family member'))];

  if (mode === 'reading') {
    return `<article class="hlni-family-reading-card">
      ${familyCover(book)}
      <div class="hlni-family-shortcut-main">
        <h4 class="hlni-family-shortcut-title">${escapeHtml(book.title || 'Buku')}</h4>
        <p class="hlni-family-shortcut-author">${escapeHtml(familyAuthorNames(book))}${book.publication_year ? ` · ${escapeHtml(book.publication_year)}` : ''}</p>
        <p class="hlni-family-reader-summary"><strong>Sedang dibaca oleh:</strong> ${escapeHtml(names.join(', '))}</p>
      </div>
    </article>`;
  }

  const readerRecords = records.map(row => `<div class="hlni-family-reader-record">
    <div class="hlni-family-reader-line"><strong>${escapeHtml(row.reviewer?.display_name || 'Family member')}</strong>${row.rating ? `<span class="stars">${familyStars(row.rating)}</span>` : ''}</div>
    ${String(row.review_text || '').trim() ? `<p class="hlni-family-review-text">${escapeHtml(row.review_text)}</p>` : ''}
  </div>`).join('');

  return `<article class="hlni-family-reading-card">
    ${familyCover(book)}
    <div class="hlni-family-shortcut-main">
      <h4 class="hlni-family-shortcut-title">${escapeHtml(book.title || 'Buku')}</h4>
      <p class="hlni-family-shortcut-author">${escapeHtml(familyAuthorNames(book))}${book.publication_year ? ` · ${escapeHtml(book.publication_year)}` : ''}</p>
      <p class="hlni-family-reader-summary"><strong>Dibaca oleh:</strong> ${escapeHtml(names.join(', '))}</p>
      <div class="hlni-family-reader-records">${readerRecords}</div>
    </div>
  </article>`;
}

async function loadFamilyReadingShortcut(mode) {
  const shell = showFamilyShortcutShell(mode);
  if (!shell || !(await hasFamilySession())) return;
  const status = mode === 'reading' ? 'READING' : 'READ';

  try {
    const { data, error } = await familyDb.from('book_reviews')
      .select(`id,book_id,user_id,reading_status,rating,review_text,started_at,finished_at,updated_at,reviewer:profiles(display_name),book:books(id,title,cover_url,publication_year,book_authors(author:authors(name)))`)
      .eq('reading_status', status)
      .order(mode === 'read' ? 'finished_at' : 'updated_at', { ascending: false, nullsFirst: false });
    if (error) throw error;

    const rows = data || [];
    const groups = groupFamilyReadingRows(rows);
    shell.meta.textContent = mode === 'reading'
      ? `${groups.length.toLocaleString('ms-MY')} buku sedang dibaca`
      : `${groups.length.toLocaleString('ms-MY')} buku · ${rows.length.toLocaleString('ms-MY')} rekod bacaan selesai`;
    shell.list.innerHTML = groups.length
      ? groups.map(group => familyReadingCard(group, mode)).join('')
      : `<div class="hlni-family-empty">${mode === 'reading' ? 'Tiada buku yang sedang dibaca sekarang.' : 'Belum ada sejarah bacaan selesai.'}</div>`;
  } catch (error) {
    console.error('[HLNI] Family reading shortcut failed.', error);
    shell.meta.textContent = 'Tak dapat memuatkan rekod sekarang.';
    shell.list.innerHTML = '<div class="hlni-family-empty">Sila cuba semula sebentar lagi.</div>';
  }
}

async function loadFamilyWorksShortcut() {
  const shell = showFamilyShortcutShell('works');
  if (!shell || !(await hasFamilySession())) return;

  try {
    const { data, error } = await familyDb.from('books')
      .select(`id,title,cover_url,publication_year,is_family_work,publisher:publishers(name),book_authors(author:authors(name))`)
      .eq('is_family_work', true)
      .is('archived_at', null)
      .order('title', { ascending: true });
    if (error) throw error;

    const rows = data || [];
    shell.meta.textContent = `${rows.length.toLocaleString('ms-MY')} karya keluarga`;
    shell.list.innerHTML = rows.length
      ? rows.map(book => `<article class="hlni-family-work-card">
          ${familyCover(book)}
          <div class="hlni-family-shortcut-main">
            <h4 class="hlni-family-shortcut-title">${escapeHtml(book.title || 'Buku')}</h4>
            <p class="hlni-family-shortcut-author">${escapeHtml(familyAuthorNames(book))}</p>
            <div class="hlni-family-work-meta">${[book.publisher?.name, book.publication_year].filter(Boolean).map(escapeHtml).join(' · ')}</div>
          </div>
        </article>`).join('')
      : '<div class="hlni-family-empty">Belum ada buku yang ditandakan sebagai Karya Keluarga.</div>';
  } catch (error) {
    console.error('[HLNI] Family works shortcut failed.', error);
    shell.meta.textContent = 'Tak dapat memuatkan Karya Keluarga sekarang.';
    shell.list.innerHTML = '<div class="hlni-family-empty">Sila cuba semula sebentar lagi.</div>';
  }
}

function openFamilyCatalogueAll() {
  document.querySelector('.nav-btn[data-nav="catalogue"]')?.click();
  setTimeout(() => {
    const search = document.getElementById('catalogue-search');
    if (search) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const category = document.getElementById('category-filter');
    if (category) {
      category.value = 'ALL';
      category.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.querySelector('[data-filter="ALL"]')?.click();
  }, 0);
}

function initFamilyStatShortcuts() {
  const shell = document.getElementById('app-shell');
  const grid = document.querySelector('#view-home .stats-grid-four');
  if (!shell || !grid) return;

  const cards = [...grid.querySelectorAll('.stat-card')];
  if (cards.length < 4) return;
  setFamilyStatLabels();

  makeStatShortcut(cards[0], 'Buka semua judul dalam Katalog', openFamilyCatalogueAll);
  makeStatShortcut(cards[1], 'Buka senarai buku yang sedang dibaca', () => loadFamilyReadingShortcut('reading'));
  makeStatShortcut(cards[2], 'Buka sejarah bacaan keluarga yang telah selesai', () => loadFamilyReadingShortcut('read'));
  makeStatShortcut(cards[3], 'Buka Karya Keluarga', loadFamilyWorksShortcut);

  const shellObserver = new MutationObserver(() => {
    if (!shell.classList.contains('hidden')) scheduleFamilyStatsRefresh(500);
  });
  shellObserver.observe(shell, { attributes: true, attributeFilter: ['class'] });

  const feed = document.getElementById('recent-reading-list');
  if (feed) {
    new MutationObserver(() => scheduleFamilyStatsRefresh(550)).observe(feed, { childList: true, subtree: true });
  }

  // If the original dashboard writes its old copy/available/read values later,
  // restore the shortcut values and refresh from the same existing tables.
  new MutationObserver(() => {
    if (!familyStatExpected || shell.classList.contains('hidden')) return;
    const expected = [
      ['stat-copies', familyStatExpected.reading],
      ['stat-available', familyStatExpected.read],
      ['stat-read', familyStatExpected.works]
    ];
    const mismatch = expected.some(([id, value]) => {
      const el = document.getElementById(id);
      return el && el.textContent !== Number(value || 0).toLocaleString('ms-MY');
    });
    if (mismatch) {
      applyFamilyStatExpected();
      scheduleFamilyStatsRefresh(700);
    }
  }).observe(grid, { childList: true, subtree: true, characterData: true });

  if (!shell.classList.contains('hidden')) scheduleFamilyStatsRefresh(700);
}

/* ========================================================================== */
/* FAMILY HOME: editorial activity + compact latest collection                */
/* ========================================================================== */

function editorializeReadingFeedRow(row) {
  if (!row || row.dataset.hlniEditorial === '1') return;
  const strong = row.querySelector('strong');
  const p = row.querySelector('p');
  if (!strong || !p) return;

  const [rawName, rawStatus = ''] = strong.textContent.split('·').map(x => x.trim());
  const starNode = p.querySelector('.stars');
  const starText = starNode?.textContent?.trim() || '';
  let title = p.textContent || '';
  if (starText) title = title.replace(starText, '');
  title = title.replace(/\s*·\s*$/, '').trim();
  if (!title) return;

  const status = normalizeSearch(rawStatus);
  let action = 'Membaca';
  if (status.includes('selesai')) action = 'Selesai membaca';
  else if (status.includes('sedang')) action = 'Sedang membaca';

  row.dataset.hlniEditorial = '1';
  row.classList.add('hlni-editorial-reading-row');
  strong.textContent = rawName || 'Family member';
  p.replaceChildren(document.createTextNode(`${action} `));
  const titleSpan = document.createElement('span');
  titleSpan.className = 'hlni-editorial-book-title';
  titleSpan.textContent = title;
  p.appendChild(titleSpan);

  if (starText) {
    const rating = document.createElement('div');
    rating.className = 'hlni-editorial-stars stars';
    rating.textContent = starText;
    p.insertAdjacentElement('afterend', rating);
  }
}

function enhanceFamilyHomeContent() {
  const home = document.getElementById('view-home');
  if (!home) return;

  const feed = document.getElementById('recent-reading-list');
  if (feed) {
    [...feed.children].forEach((row, index) => {
      row.hidden = index >= 3;
      if (index < 3) editorializeReadingFeedRow(row);
    });
  }

  const latest = document.getElementById('latest-list');
  if (latest) {
    [...latest.children].forEach((row, index) => {
      row.hidden = index >= 4;
      if (index < 4) row.classList.add('hlni-family-latest-card');
    });
  }
}

function initFamilyHomeEnhancements() {
  const feed = document.getElementById('recent-reading-list');
  const latest = document.getElementById('latest-list');
  enhanceFamilyHomeContent();
  if (feed) new MutationObserver(enhanceFamilyHomeContent).observe(feed, { childList: true, subtree: false });
  if (latest) new MutationObserver(enhanceFamilyHomeContent).observe(latest, { childList: true, subtree: false });
}

/* ========================================================================== */
/* Init                                                                       */
/* ========================================================================== */

function init() {
  installStyles();
  initCategorySearch();
  initVisitorTicker();
  initPublicStatShortcuts();
  initFamilyStatShortcuts();
  initFamilyHomeEnhancements();

  // Public categories and family categories are populated asynchronously by
  // the existing scripts, so this keeps enhancements in sync without changing
  // their database or routing logic.
  setTimeout(() => {
    initCategorySearch();
    initPublicStatShortcuts();
    initFamilyStatShortcuts();
    enhanceFamilyHomeContent();
    scheduleFamilyStatsRefresh(0);
  }, 900);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

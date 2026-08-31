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

const STYLE_ID = 'hlni-v8-3-styles';

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
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

function optionCode(text = '') {
  return String(text).match(/\(([A-Z]{1,3})\)\s*$/)?.[1] || '';
}

function enhanceCategorySelect(select) {
  if (!select || select.dataset.hlniSearchEnhanced === '1') return;
  select.dataset.hlniSearchEnhanced = '1';

  // Keep the native selector visible as a reliable fallback on iPhone/Safari.
  // The search box below it is only for quickly choosing a MANUAL LCC category.
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

function init() {
  installStyles();
  initCategorySearch();
  initVisitorTicker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

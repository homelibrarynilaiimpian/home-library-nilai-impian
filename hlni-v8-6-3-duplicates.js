import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://hpkzlioltmzyoalnqhgz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_57JvYsgIIi1LDnMYkew7XA_mOrQaZu2';

const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'hlni-auth-v1'
  }
});

const STYLE_ID = 'hlni-v863-duplicate-styles';

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hlni-duplicate-message {
      display: none;
      margin-top: 7px;
      padding: 9px 10px;
      border: 1px solid rgba(154, 116, 47, .28);
      border-radius: 10px;
      background: rgba(184, 145, 69, .09);
      color: #62502d;
      font-size: 11.5px;
      line-height: 1.48;
      font-weight: 600;
    }

    .hlni-duplicate-message.show { display: block; }

    .hlni-duplicate-message strong {
      color: #4b3c20;
      font-weight: 800;
    }

    .hlni-duplicate-loading {
      display: none;
      margin-top: 6px;
      color: #7a7e77;
      font-size: 11px;
      line-height: 1.4;
    }

    .hlni-duplicate-loading.show { display: block; }

    #hlni-quick-isbn-duplicate {
      margin: 8px 0 0;
    }
  `;
  document.head.appendChild(style);
}

function esc(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cleanISBN(value = '') {
  return String(value).toUpperCase().replace(/[^0-9X]/g, '');
}

function cleanCallNo(value = '') {
  return String(value).trim().replace(/\s+/g, ' ');
}

function makeMessage(input, id) {
  let el = document.getElementById(id);
  if (el) return el;

  el = document.createElement('small');
  el.id = id;
  el.className = 'hlni-duplicate-message';
  el.setAttribute('aria-live', 'polite');

  const label = input.closest('label');
  if (label) {
    label.appendChild(el);
  } else {
    const row = input.closest('.isbn-action-row');
    if (row) {
      row.insertAdjacentElement('afterend', el);
    } else {
      input.insertAdjacentElement('afterend', el);
    }
  }
  return el;
}

function formatMatches(rows = [], limit = 3) {
  return rows.slice(0, limit).map(row => {
    const serial = row.accession_no ? ` · No. Siri ${esc(row.accession_no)}` : '';
    return `“${esc(row.title || 'Rekod buku')}”${serial}`;
  }).join('; ');
}

async function queryDuplicates(kind, value, form = null) {
  const excludeBookId = form?.elements?.book_id?.value || null;
  const excludeCopyId = form?.elements?.copy_id?.value || null;

  const { data, error } = await db.rpc('family_duplicate_check', {
    p_kind: kind,
    p_value: value,
    p_exclude_book_id: excludeBookId || null,
    p_exclude_copy_id: excludeCopyId || null
  });

  if (error) throw error;
  return data || [];
}

async function checkField(input, kind, form, messageId, { quick = false } = {}) {
  if (!input) return;

  const raw = kind === 'ISBN' ? cleanISBN(input.value) : cleanCallNo(input.value);
  const message = makeMessage(input, messageId);

  const enough = kind === 'ISBN'
    ? (raw.length === 10 || raw.length === 13)
    : raw.length >= 3;

  if (!enough) {
    message.classList.remove('show');
    message.innerHTML = '';
    input.dataset.hlniDuplicateChecked = raw;
    return;
  }

  // Do not repeat the same lookup unless a forced check is requested.
  if (input.dataset.hlniDuplicateChecked === raw && input.dataset.hlniDuplicateBusy !== '1') return;

  input.dataset.hlniDuplicateBusy = '1';

  try {
    const rows = await queryDuplicates(kind, raw, form);

    // Ignore an outdated response if the field changed while the query was running.
    const current = kind === 'ISBN' ? cleanISBN(input.value) : cleanCallNo(input.value);
    if (current !== raw) return;

    input.dataset.hlniDuplicateChecked = raw;

    if (!rows.length) {
      message.classList.remove('show');
      message.innerHTML = '';
      return;
    }

    const examples = formatMatches(rows);
    const extra = rows.length > 3 ? ` dan ${rows.length - 3} lagi` : '';

    if (kind === 'CALLNO') {
      message.innerHTML =
        `<strong>Duplicate Call No. dikesan.</strong> ${examples}${extra}. ` +
        `Call No. yang sama boleh jadi sah untuk naskhah tertentu, jadi semak rekod ini sebelum simpan.`;
    } else {
      const isEdit = form?.id === 'edit-book-form';
      message.innerHTML = isEdit
        ? `<strong>Duplicate ISBN dikesan.</strong> ISBN ini sudah digunakan oleh ${examples}${extra}. Semak sebelum simpan perubahan.`
        : `<strong>ISBN sudah ada dalam katalog.</strong> ${examples}${extra}. Jika ini naskhah kedua buku yang sama, boleh terus simpan — sistem akan tambah naskhah pada judul sedia ada.`;
    }

    message.classList.add('show');
  } catch (error) {
    // Duplicate checking must never stop normal book entry if the helper is temporarily unavailable.
    console.error('[HLNI duplicate check]', error);
    message.classList.remove('show');
    message.innerHTML = '';
  } finally {
    input.dataset.hlniDuplicateBusy = '0';
  }
}

function debounce(fn, delay = 420) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function bindInput(input, kind, form, messageId) {
  if (!input || input.dataset.hlniDuplicateBound === '1') return;
  input.dataset.hlniDuplicateBound = '1';

  const run = () => checkField(input, kind, form, messageId);
  const delayed = debounce(run);

  input.addEventListener('input', delayed);
  input.addEventListener('change', run);
  input.addEventListener('blur', run);
}

function bindAll() {
  installStyles();

  const addForm = document.getElementById('add-book-form');
  const editForm = document.getElementById('edit-book-form');

  bindInput(addForm?.elements?.callno, 'CALLNO', addForm, 'hlni-add-callno-duplicate');
  bindInput(addForm?.elements?.isbn13, 'ISBN', addForm, 'hlni-add-isbn-duplicate');

  bindInput(editForm?.elements?.callno, 'CALLNO', editForm, 'hlni-edit-callno-duplicate');
  bindInput(editForm?.elements?.isbn13, 'ISBN', editForm, 'hlni-edit-isbn-duplicate');

  const quickISBN = document.getElementById('quick-isbn');
  bindInput(quickISBN, 'ISBN', addForm, 'hlni-quick-isbn-duplicate');

  // Metadata lookup and barcode scanning can update fields programmatically.
  // This lightweight watcher only queries when a value actually changes.
  setInterval(() => {
    const fields = [
      [quickISBN, 'ISBN', addForm, 'hlni-quick-isbn-duplicate'],
      [addForm?.elements?.isbn13, 'ISBN', addForm, 'hlni-add-isbn-duplicate'],
      [addForm?.elements?.callno, 'CALLNO', addForm, 'hlni-add-callno-duplicate'],
      [editForm?.elements?.isbn13, 'ISBN', editForm, 'hlni-edit-isbn-duplicate'],
      [editForm?.elements?.callno, 'CALLNO', editForm, 'hlni-edit-callno-duplicate']
    ];

    fields.forEach(([input, kind, form, id]) => {
      if (!input) return;
      const current = kind === 'ISBN' ? cleanISBN(input.value) : cleanCallNo(input.value);
      if (current && current !== input.dataset.hlniDuplicateChecked && input.dataset.hlniDuplicateBusy !== '1') {
        checkField(input, kind, form, id);
      }
    });
  }, 1200);

  addForm?.addEventListener('reset', () => {
    setTimeout(() => {
      ['hlni-add-callno-duplicate', 'hlni-add-isbn-duplicate', 'hlni-quick-isbn-duplicate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove('show');
          el.innerHTML = '';
        }
      });
    }, 0);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindAll, { once: true });
} else {
  bindAll();
}

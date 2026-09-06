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

// HLNI V8.6.7 — inline duplicate UX fix
// - fixes empty duplicate-message pill occupying space
// - live No. Siri/Accession duplicate check while typing
// - keeps ISBN and Call No. live warnings
const STYLE_ID = 'hlni-v867-duplicate-styles';

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hlni-duplicate-message,
    .hlni-duplicate-message[hidden] {
      display: none !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      min-height: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
    }

    .hlni-duplicate-message.show:not([hidden]) {
      display: block !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      margin-top: 7px !important;
      padding: 9px 10px !important;
      border: 1px solid rgba(154, 116, 47, .28) !important;
      border-radius: 10px;
      background: rgba(184, 145, 69, .09);
      color: #62502d;
      font-size: 11.5px;
      line-height: 1.48;
      font-weight: 600;
    }

    .hlni-duplicate-message.show.error:not([hidden]) {
      border-color: rgba(150, 54, 54, .34) !important;
      background: rgba(170, 65, 65, .08);
      color: #7a2f2f;
    }

    .hlni-duplicate-message strong {
      color: #4b3c20;
      font-weight: 800;
    }

    .hlni-duplicate-message.error strong {
      color: #692424;
    }

    #hlni-quick-isbn-duplicate.show:not([hidden]) {
      margin: 8px 0 0 !important;
    }

    input.hlni-duplicate-invalid {
      border-color: rgba(150, 54, 54, .62) !important;
      box-shadow: 0 0 0 3px rgba(150, 54, 54, .08) !important;
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

function cleanAccession(value = '') {
  const raw = String(value ?? '').trim();
  if (!raw || !/^\d+$/.test(raw) || raw.length > 6) return '';
  return raw.padStart(6, '0');
}

function normalizedValue(kind, value) {
  if (kind === 'ISBN') return cleanISBN(value);
  if (kind === 'CALLNO') return cleanCallNo(value);
  if (kind === 'ACCESSION') return cleanAccession(value);
  return '';
}

function makeMessage(input, id) {
  let el = document.getElementById(id);
  if (el) return el;

  el = document.createElement('small');
  el.id = id;
  el.className = 'hlni-duplicate-message';
  el.setAttribute('aria-live', 'polite');
  el.hidden = true;

  const label = input.closest('label');
  if (label) {
    label.appendChild(el);
  } else {
    const row = input.closest('.isbn-action-row');
    if (row) row.insertAdjacentElement('afterend', el);
    else input.insertAdjacentElement('afterend', el);
  }
  return el;
}

function hideMessage(input, message) {
  if (message) {
    message.hidden = true;
    message.classList.remove('show', 'error');
    message.replaceChildren();
  }
  if (input) {
    input.classList.remove('hlni-duplicate-invalid');
    if (input.dataset.hlniDuplicateOwnValidity === '1') {
      input.setCustomValidity('');
      input.dataset.hlniDuplicateOwnValidity = '0';
    }
  }
}

function showMessage(message, html, { error = false } = {}) {
  message.innerHTML = html;
  message.classList.toggle('error', error);
  message.classList.add('show');
  message.hidden = false;
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

function enoughToCheck(kind, raw, input) {
  if (kind === 'ISBN') return raw.length === 10 || raw.length === 13;
  if (kind === 'CALLNO') return raw.length >= 3;
  if (kind === 'ACCESSION') {
    const typed = String(input?.value ?? '').trim();
    return /^\d{1,6}$/.test(typed) && raw.length === 6;
  }
  return false;
}

async function checkField(input, kind, form, messageId, { force = false } = {}) {
  if (!input) return;

  const raw = normalizedValue(kind, input.value);
  const message = makeMessage(input, messageId);

  if (!enoughToCheck(kind, raw, input)) {
    hideMessage(input, message);
    input.dataset.hlniDuplicateChecked = raw;
    return;
  }

  if (!force && input.dataset.hlniDuplicateChecked === raw && input.dataset.hlniDuplicateBusy !== '1') return;

  const requestId = String((Number(input.dataset.hlniDuplicateRequestId || '0') + 1));
  input.dataset.hlniDuplicateRequestId = requestId;
  input.dataset.hlniDuplicateBusy = '1';

  try {
    const rows = await queryDuplicates(kind, raw, form);

    // Ignore a stale response if user has already typed something else.
    if (input.dataset.hlniDuplicateRequestId !== requestId) return;
    if (normalizedValue(kind, input.value) !== raw) return;

    input.dataset.hlniDuplicateChecked = raw;

    if (!rows.length) {
      hideMessage(input, message);
      return;
    }

    const examples = formatMatches(rows);
    const extra = rows.length > 3 ? ` dan ${rows.length - 3} lagi` : '';

    if (kind === 'ACCESSION') {
      showMessage(
        message,
        `<strong>No. Siri ${esc(raw)} sudah digunakan.</strong> ${examples}${extra}. ` +
        `No. Siri mesti unik. Gunakan nombor lain sebelum simpan.`,
        { error: true }
      );
      input.classList.add('hlni-duplicate-invalid');
      input.setCustomValidity(`No. Siri ${raw} sudah digunakan.`);
      input.dataset.hlniDuplicateOwnValidity = '1';
      return;
    }

    hideMessage(input, null);

    if (kind === 'CALLNO') {
      showMessage(
        message,
        `<strong>Duplicate Call No. dikesan.</strong> ${examples}${extra}. ` +
        `Call No. yang sama boleh jadi sah untuk naskhah tertentu, jadi semak rekod ini sebelum simpan.`
      );
      return;
    }

    const isEdit = form?.id === 'edit-book-form';
    showMessage(
      message,
      isEdit
        ? `<strong>Duplicate ISBN dikesan.</strong> ISBN ini sudah digunakan oleh ${examples}${extra}. Semak sebelum simpan perubahan.`
        : `<strong>ISBN sudah ada dalam katalog.</strong> ${examples}${extra}. Jika ini naskhah kedua buku yang sama, boleh terus simpan — sistem akan tambah naskhah pada judul sedia ada.`
    );
  } catch (error) {
    console.error('[HLNI duplicate check]', error);
    hideMessage(input, message);
  } finally {
    if (input.dataset.hlniDuplicateRequestId === requestId) {
      input.dataset.hlniDuplicateBusy = '0';
    }
  }
}

function debounce(fn, delay = 260) {
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
  const delayed = debounce(run, kind === 'ACCESSION' ? 180 : 320);

  // Live check while typing. No submit required.
  input.addEventListener('input', delayed);
  input.addEventListener('change', () => checkField(input, kind, form, messageId, { force: true }));
  input.addEventListener('blur', () => {
    if (kind === 'ACCESSION') {
      const normalized = cleanAccession(input.value);
      if (normalized && String(input.value).trim() !== normalized) {
        input.value = normalized;
        input.dataset.hlniDuplicateChecked = '';
      }
    }
    checkField(input, kind, form, messageId, { force: true });
  });
}

function clearMessages(ids = [], inputs = []) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.hidden = true;
      el.classList.remove('show', 'error');
      el.replaceChildren();
    }
  });

  inputs.forEach(input => {
    if (!input) return;
    input.classList.remove('hlni-duplicate-invalid');
    input.setCustomValidity('');
    input.dataset.hlniDuplicateOwnValidity = '0';
    input.dataset.hlniDuplicateChecked = '';
    input.dataset.hlniDuplicateRequestId = '0';
  });
}

function bindAll() {
  installStyles();

  const addForm = document.getElementById('add-book-form');
  const editForm = document.getElementById('edit-book-form');
  const quickISBN = document.getElementById('quick-isbn');

  bindInput(addForm?.elements?.accession, 'ACCESSION', addForm, 'hlni-add-accession-duplicate');
  bindInput(addForm?.elements?.callno, 'CALLNO', addForm, 'hlni-add-callno-duplicate');
  bindInput(addForm?.elements?.isbn13, 'ISBN', addForm, 'hlni-add-isbn-duplicate');

  bindInput(editForm?.elements?.accession, 'ACCESSION', editForm, 'hlni-edit-accession-duplicate');
  bindInput(editForm?.elements?.callno, 'CALLNO', editForm, 'hlni-edit-callno-duplicate');
  bindInput(editForm?.elements?.isbn13, 'ISBN', editForm, 'hlni-edit-isbn-duplicate');

  bindInput(quickISBN, 'ISBN', addForm, 'hlni-quick-isbn-duplicate');

  // Catch values inserted programmatically by ISBN lookup/barcode scanning.
  setInterval(() => {
    const fields = [
      [quickISBN, 'ISBN', addForm, 'hlni-quick-isbn-duplicate'],
      [addForm?.elements?.isbn13, 'ISBN', addForm, 'hlni-add-isbn-duplicate'],
      [addForm?.elements?.accession, 'ACCESSION', addForm, 'hlni-add-accession-duplicate'],
      [addForm?.elements?.callno, 'CALLNO', addForm, 'hlni-add-callno-duplicate'],
      [editForm?.elements?.isbn13, 'ISBN', editForm, 'hlni-edit-isbn-duplicate'],
      [editForm?.elements?.accession, 'ACCESSION', editForm, 'hlni-edit-accession-duplicate'],
      [editForm?.elements?.callno, 'CALLNO', editForm, 'hlni-edit-callno-duplicate']
    ];

    fields.forEach(([input, kind, form, id]) => {
      if (!input) return;
      const current = normalizedValue(kind, input.value);
      if (
        enoughToCheck(kind, current, input) &&
        current !== input.dataset.hlniDuplicateChecked &&
        input.dataset.hlniDuplicateBusy !== '1'
      ) {
        checkField(input, kind, form, id);
      }
    });
  }, 850);

  addForm?.addEventListener('reset', () => {
    setTimeout(() => clearMessages(
      [
        'hlni-add-accession-duplicate',
        'hlni-add-callno-duplicate',
        'hlni-add-isbn-duplicate',
        'hlni-quick-isbn-duplicate'
      ],
      [
        addForm?.elements?.accession,
        addForm?.elements?.callno,
        addForm?.elements?.isbn13,
        quickISBN
      ]
    ), 0);
  });

  editForm?.addEventListener('reset', () => {
    setTimeout(() => clearMessages(
      [
        'hlni-edit-accession-duplicate',
        'hlni-edit-callno-duplicate',
        'hlni-edit-isbn-duplicate'
      ],
      [
        editForm?.elements?.accession,
        editForm?.elements?.callno,
        editForm?.elements?.isbn13
      ]
    ), 0);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindAll, { once: true });
} else {
  bindAll();
}

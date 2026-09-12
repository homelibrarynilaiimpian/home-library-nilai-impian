import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://hpkzlioltmzyoalnqhgz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_57JvYsgIIi1LDnMYkew7XA_mOrQaZu2';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'hlni-auth-v1'
  }
});

const STYLE_ID = 'hlni-family-location-style';
const LOCATION_CLASS = 'hlni-location-fields';

let rackMap = new Map();
let editLoadToken = 0;
let lastLoadedCopyId = null;

function toast(message, isError = false) {
  const el = document.querySelector('#toast');
  if (!el) {
    if (isError) alert(message);
    return;
  }
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(window.__hlniLocationToastTimer);
  window.__hlniLocationToastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${LOCATION_CLASS}{
      grid-column:1/-1;
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:12px;
      padding:14px;
      border:1px solid rgba(31,59,50,.14);
      border-radius:14px;
      background:#f5f8f6;
    }
    .${LOCATION_CLASS} .hlni-location-head{
      grid-column:1/-1;
      margin-bottom:2px;
    }
    .${LOCATION_CLASS} .hlni-location-head strong{
      color:#1f3b32;
      font-size:14px;
    }
    .${LOCATION_CLASS} .hlni-location-head small{
      display:block;
      color:#6c7772;
      font-size:11px;
      line-height:1.45;
      margin-top:3px;
    }
    .${LOCATION_CLASS} label{min-width:0}
    .${LOCATION_CLASS} select{width:100%}
    .hlni-location-preview{
      grid-column:1/-1;
      min-height:38px;
      display:flex;
      align-items:center;
      padding:9px 11px;
      border-radius:10px;
      background:#fff;
      border:1px solid rgba(31,59,50,.1);
      color:#1f3b32;
      font-size:12px;
      font-weight:750;
    }
    .hlni-location-preview.empty{
      color:#7b837f;
      font-weight:600;
    }
    @media(max-width:560px){
      .${LOCATION_CLASS}{grid-template-columns:1fr}
      .${LOCATION_CLASS} .hlni-location-head,.hlni-location-preview{grid-column:1}
    }
  `;
  document.head.appendChild(style);
}

async function loadRackRows() {
  const { data, error } = await supabase.rpc('public_rack_navigation_v1');
  if (error) throw error;

  rackMap = new Map();
  for (const row of data || []) {
    const rackNo = Number(row.rack_no);
    if (!rackMap.has(rackNo)) {
      rackMap.set(rackNo, {
        rack_no: rackNo,
        rack_name: row.rack_name || `Rak ${rackNo}`,
        bays: []
      });
    }
    if (row.bay_no != null) {
      rackMap.get(rackNo).bays.push({
        bay_no: Number(row.bay_no),
        bay_name: row.bay_name || `Bay ${row.bay_no}`
      });
    }
  }

  for (const rack of rackMap.values()) {
    rack.bays.sort((a,b) => a.bay_no - b.bay_no);
  }
}

function block(form) {
  return form?.querySelector(`.${LOCATION_CLASS}`) || null;
}

function updatePreview(form) {
  const wrap = block(form);
  if (!wrap) return;
  const rack = wrap.querySelector('[data-location-rack]')?.value || '';
  const bay = wrap.querySelector('[data-location-bay]')?.value || '';
  const preview = wrap.querySelector('.hlni-location-preview');

  if (rack && bay) {
    preview.textContent = `📍 Rak ${rack} • Bay ${bay}`;
    preview.classList.remove('empty');
  } else if (rack) {
    preview.textContent = `Rak ${rack} dipilih · Bay belum ditetapkan`;
    preview.classList.add('empty');
  } else {
    preview.textContent = 'Lokasi belum ditetapkan';
    preview.classList.add('empty');
  }
}

function fillBayOptions(form, rackNo, selectedBay = '') {
  const wrap = block(form);
  const bay = wrap?.querySelector('[data-location-bay]');
  if (!bay) return;

  const rack = rackMap.get(Number(rackNo));
  bay.innerHTML = '<option value="">Belum ditetapkan</option>';

  if (!rackNo || !rack) {
    bay.disabled = true;
    updatePreview(form);
    return;
  }

  bay.disabled = false;
  bay.innerHTML += rack.bays.map(b => `<option value="${b.bay_no}">${b.bay_name}</option>`).join('');

  if (selectedBay && rack.bays.some(b => Number(b.bay_no) === Number(selectedBay))) {
    bay.value = String(selectedBay);
  } else {
    bay.value = '';
  }
  updatePreview(form);
}

function injectFields(form) {
  if (!form || block(form)) return;

  const oldShelf = form.elements.shelf;
  const shelfLabel = oldShelf?.closest('label');
  if (!shelfLabel) return;
  shelfLabel.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = LOCATION_CLASS;
  wrap.innerHTML = `
    <div class="hlni-location-head">
      <strong>Lokasi Fizikal Buku</strong>
      <small>Pilih Rak dan Bay. Bay 1 bermula dari paling atas. Boleh biarkan kosong jika lokasi belum dikemaskini.</small>
    </div>
    <label>
      <span>Rak</span>
      <select data-location-rack>
        <option value="">Belum ditetapkan</option>
        ${[...rackMap.values()].sort((a,b)=>a.rack_no-b.rack_no)
          .map(r=>`<option value="${r.rack_no}">${r.rack_name}</option>`).join('')}
      </select>
    </label>
    <label>
      <span>Bay</span>
      <select data-location-bay disabled>
        <option value="">Belum ditetapkan</option>
      </select>
    </label>
    <div class="hlni-location-preview empty">Lokasi belum ditetapkan</div>
  `;
  shelfLabel.insertAdjacentElement('afterend', wrap);

  const rackSelect = wrap.querySelector('[data-location-rack]');
  const baySelect = wrap.querySelector('[data-location-bay]');

  rackSelect.addEventListener('change', () => {
    wrap.dataset.userTouched = '1';
    fillBayOptions(form, rackSelect.value, '');
  });

  baySelect.addEventListener('change', () => {
    wrap.dataset.userTouched = '1';
    updatePreview(form);
  });

  form.addEventListener('reset', () => {
    setTimeout(() => {
      delete wrap.dataset.userTouched;
      rackSelect.value = '';
      fillBayOptions(form, '', '');
      if (form.id === 'add-book-form') clearOwnPending().catch(() => {});
    }, 0);
  });
}

async function currentUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
}

async function clearOwnPending() {
  const user = await currentUser();
  if (!user) return;
  await supabase.from('location_pending').delete().eq('user_id', user.id);
}

async function stageLocation(form) {
  const user = await currentUser();
  if (!user) throw new Error('Sesi login tidak dijumpai. Sila login semula.');

  const wrap = block(form);
  const rackRaw = wrap?.querySelector('[data-location-rack]')?.value || '';
  const bayRaw = wrap?.querySelector('[data-location-bay]')?.value || '';
  const rack_no = rackRaw ? Number(rackRaw) : null;
  const bay_no = bayRaw ? Number(bayRaw) : null;

  if (bay_no && !rack_no) throw new Error('Pilih Rak sebelum pilih Bay.');

  const targetCopyId = form.id === 'edit-book-form'
    ? (form.elements.copy_id?.value || null)
    : null;

  const { error } = await supabase.from('location_pending').upsert({
    user_id: user.id,
    target_copy_id: targetCopyId,
    rack_no,
    bay_no,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  if (error) throw error;
}

async function loadEditLocation(copyId, token) {
  const form = document.querySelector('#edit-book-form');
  const wrap = block(form);
  if (!form || !wrap || !copyId || token !== editLoadToken) return;

  const { data, error } = await supabase
    .from('copies')
    .select('id,rack_no,bay_no')
    .eq('id', copyId)
    .maybeSingle();

  if (error) {
    console.error('[HLNI Location] load edit', error);
    return;
  }
  if (token !== editLoadToken) return;

  // Never overwrite a choice the user has already started making.
  if (wrap.dataset.userTouched === '1') return;

  const rackSelect = wrap.querySelector('[data-location-rack]');
  const rackNo = data?.rack_no ? Number(data.rack_no) : '';
  const bayNo = data?.bay_no ? Number(data.bay_no) : '';

  rackSelect.value = rackNo ? String(rackNo) : '';
  fillBayOptions(form, rackNo, bayNo);
  lastLoadedCopyId = copyId;
}

function syncEditDialog() {
  const dialog = document.querySelector('#edit-dialog');
  const form = document.querySelector('#edit-book-form');
  const wrap = block(form);
  if (!dialog || !form || !wrap) return;

  if (!dialog.open) {
    editLoadToken++;
    lastLoadedCopyId = null;
    delete wrap.dataset.userTouched;
    return;
  }

  const token = ++editLoadToken;
  delete wrap.dataset.userTouched;

  let tries = 0;
  const check = () => {
    if (token !== editLoadToken || !dialog.open) return;
    const copyId = form.elements.copy_id?.value || '';
    if (copyId) {
      if (copyId !== lastLoadedCopyId) loadEditLocation(copyId, token);
      return;
    }
    if (++tries < 12) setTimeout(check, 50);
  };
  setTimeout(check, 20);
}

function observeEditDialog() {
  const dialog = document.querySelector('#edit-dialog');
  if (!dialog) return;
  new MutationObserver(syncEditDialog).observe(dialog, {
    attributes: true,
    attributeFilter: ['open']
  });
}

function installSubmitGuard() {
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!['add-book-form','edit-book-form'].includes(form.id)) return;

    if (form.dataset.hlniLocationBypass === '1') {
      delete form.dataset.hlniLocationBypass;
      return;
    }

    const submitter = event.submitter || form.querySelector('button[type="submit"]');
    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      await stageLocation(form);
      form.dataset.hlniLocationBypass = '1';
      form.requestSubmit(submitter || undefined);
    } catch (error) {
      console.error('[HLNI Location] stage', error);
      toast(error?.message || 'Lokasi Rak/Bay tak dapat disimpan. Cuba semula.', true);
    }
  }, true);
}

async function boot() {
  installStyles();

  try {
    await loadRackRows();
  } catch (error) {
    console.error('[HLNI Location] rack metadata', error);
    toast('Senarai Rak/Bay tak dapat dimuatkan.', true);
    return;
  }

  injectFields(document.querySelector('#add-book-form'));
  injectFields(document.querySelector('#edit-book-form'));
  installSubmitGuard();
  observeEditDialog();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once:true });
} else {
  boot();
}

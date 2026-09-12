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

let rackRows = [];
let rackMap = new Map();

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
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
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
    .${LOCATION_CLASS} label{
      min-width:0;
    }
    .${LOCATION_CLASS} select{
      width:100%;
    }
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
      .${LOCATION_CLASS} .hlni-location-head,
      .hlni-location-preview{grid-column:1}
    }
  `;
  document.head.appendChild(style);
}

async function loadRackRows() {
  const { data, error } = await supabase.rpc('public_rack_navigation_v1');
  if (error) throw error;
  rackRows = data || [];
  rackMap = new Map();

  for (const row of rackRows) {
    const rackNo = Number(row.rack_no);
    if (!rackMap.has(rackNo)) {
      rackMap.set(rackNo, {
        rack_no: rackNo,
        rack_name: row.rack_name || `Rak ${rackNo}`,
        bay_count: Number(row.bay_count || 0),
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

function oldShelfLabel(form) {
  const input = form?.elements?.shelf;
  return input?.closest('label') || null;
}

function locationBlock(form) {
  return form?.querySelector(`.${LOCATION_CLASS}`) || null;
}

function updatePreview(form) {
  const block = locationBlock(form);
  if (!block) return;
  const rack = block.querySelector('[data-location-rack]')?.value || '';
  const bay = block.querySelector('[data-location-bay]')?.value || '';
  const preview = block.querySelector('.hlni-location-preview');
  if (!preview) return;

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
  const block = locationBlock(form);
  if (!block) return;
  const bay = block.querySelector('[data-location-bay]');
  if (!bay) return;

  const rack = rackMap.get(Number(rackNo));
  bay.innerHTML = '<option value="">Belum ditetapkan</option>';

  if (!rackNo || !rack) {
    bay.disabled = true;
    updatePreview(form);
    return;
  }

  bay.disabled = false;
  bay.innerHTML += rack.bays.map(b =>
    `<option value="${b.bay_no}">${b.bay_name}</option>`
  ).join('');

  if (selectedBay && rack.bays.some(b => Number(b.bay_no) === Number(selectedBay))) {
    bay.value = String(selectedBay);
  }
  updatePreview(form);
}

function injectLocationFields(form) {
  if (!form || locationBlock(form)) return;

  const shelfLabel = oldShelfLabel(form);
  if (!shelfLabel) return;
  shelfLabel.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = LOCATION_CLASS;
  wrap.innerHTML = `
    <div class="hlni-location-head">
      <div>
        <strong>Lokasi Fizikal Buku</strong>
        <small>Pilih Rak dan Bay. Bay 1 bermula dari paling atas. Boleh biarkan kosong jika lokasi belum dikemaskini.</small>
      </div>
    </div>
    <label>
      <span>Rak</span>
      <select data-location-rack aria-label="Pilih Rak">
        <option value="">Belum ditetapkan</option>
        ${[...rackMap.values()]
          .sort((a,b)=>a.rack_no-b.rack_no)
          .map(r=>`<option value="${r.rack_no}">${r.rack_name}</option>`)
          .join('')}
      </select>
    </label>
    <label>
      <span>Bay</span>
      <select data-location-bay aria-label="Pilih Bay" disabled>
        <option value="">Belum ditetapkan</option>
      </select>
    </label>
    <div class="hlni-location-preview empty">Lokasi belum ditetapkan</div>
  `;

  shelfLabel.insertAdjacentElement('afterend', wrap);

  const rack = wrap.querySelector('[data-location-rack]');
  const bay = wrap.querySelector('[data-location-bay]');

  rack.addEventListener('change', () => {
    fillBayOptions(form, rack.value, '');
  });
  bay.addEventListener('change', () => updatePreview(form));

  form.addEventListener('reset', () => {
    setTimeout(() => {
      rack.value = '';
      fillBayOptions(form, '', '');
      updatePreview(form);
      if (form.id === 'add-book-form') clearOwnPendingLocation().catch(() => {});
    }, 0);
  });
}

function getSelection(form) {
  const block = locationBlock(form);
  const rackRaw = block?.querySelector('[data-location-rack]')?.value || '';
  const bayRaw = block?.querySelector('[data-location-bay]')?.value || '';
  return {
    rack_no: rackRaw ? Number(rackRaw) : null,
    bay_no: bayRaw ? Number(bayRaw) : null
  };
}

async function sessionUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
}

async function stageLocation(form) {
  const user = await sessionUser();
  if (!user) throw new Error('Sesi login tidak dijumpai. Sila login semula.');

  const { rack_no, bay_no } = getSelection(form);
  if (bay_no && !rack_no) throw new Error('Pilih Rak sebelum pilih Bay.');

  const targetCopyId = form.id === 'edit-book-form'
    ? (form.elements.copy_id?.value || null)
    : null;

  const { error } = await supabase
    .from('location_pending')
    .upsert({
      user_id: user.id,
      target_copy_id: targetCopyId,
      rack_no,
      bay_no,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) throw error;
}

async function clearOwnPendingLocation() {
  const user = await sessionUser();
  if (!user) return;
  await supabase.from('location_pending').delete().eq('user_id', user.id);
}

async function loadEditLocation() {
  const form = document.querySelector('#edit-book-form');
  const dialog = document.querySelector('#edit-dialog');
  if (!form || !dialog?.open) return;

  const copyId = form.elements.copy_id?.value;
  if (!copyId) return;

  const block = locationBlock(form);
  if (!block) return;

  const rackSelect = block.querySelector('[data-location-rack]');
  const { data, error } = await supabase
    .from('copies')
    .select('id,rack_no,bay_no')
    .eq('id', copyId)
    .maybeSingle();

  if (error) {
    console.error('[HLNI Location] load edit location', error);
    return;
  }

  const rackNo = data?.rack_no ? Number(data.rack_no) : '';
  const bayNo = data?.bay_no ? Number(data.bay_no) : '';

  rackSelect.value = rackNo ? String(rackNo) : '';
  fillBayOptions(form, rackNo, bayNo);
  updatePreview(form);
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
      console.error('[HLNI Location] staging failed', error);
      toast(error?.message || 'Lokasi Rak/Bay tak dapat disimpan. Cuba semula.', true);
    }
  }, true);
}

function observeEditDialog() {
  const dialog = document.querySelector('#edit-dialog');
  if (!dialog) return;

  const observer = new MutationObserver(() => {
    if (dialog.open) setTimeout(loadEditLocation, 80);
  });
  observer.observe(dialog, { attributes:true, attributeFilter:['open'] });

  document.addEventListener('click', () => {
    if (dialog.open) setTimeout(loadEditLocation, 120);
  }, true);
}

async function boot() {
  installStyles();

  try {
    await loadRackRows();
  } catch (error) {
    console.error('[HLNI Location] rack metadata failed', error);
    toast('Senarai Rak/Bay tak dapat dimuatkan.', true);
    return;
  }

  injectLocationFields(document.querySelector('#add-book-form'));
  injectLocationFields(document.querySelector('#edit-book-form'));
  installSubmitGuard();
  observeEditDialog();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once:true });
} else {
  boot();
}

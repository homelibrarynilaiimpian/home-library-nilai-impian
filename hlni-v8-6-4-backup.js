import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://hpkzlioltmzyoalnqhgz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_57JvYsgIIi1LDnMYkew7XA_mOrQaZu2';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'hlni-auth-v1'
  }
});

const STYLE_ID = 'hlni-v864-backup-style';

function esc(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hlni-backup-dialog { width:min(760px, calc(100vw - 22px)); max-height:88vh; border:0; border-radius:20px; padding:0; background:#fffdf8; box-shadow:0 24px 70px rgba(20,42,34,.28); }
    .hlni-backup-dialog::backdrop { background:rgba(18,31,27,.48); backdrop-filter:blur(2px); }
    .hlni-backup-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:20px 20px 12px; border-bottom:1px solid rgba(31,59,50,.10); }
    .hlni-backup-head h3 { margin:3px 0 0; color:#1f3b32; font-family:Georgia,'Times New Roman',serif; font-size:26px; font-weight:600; }
    .hlni-backup-body { padding:18px 20px 22px; display:grid; gap:16px; }
    .hlni-backup-state { border:1px solid rgba(31,59,50,.12); border-radius:16px; padding:14px; background:#fffaf1; }
    .hlni-backup-state-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .hlni-backup-state h4 { margin:0 0 4px; color:#203b33; font-size:15px; }
    .hlni-backup-state p { margin:0; color:#69736e; font-size:12.5px; line-height:1.55; }
    .hlni-backup-pill { flex:0 0 auto; border-radius:999px; padding:6px 9px; font-size:10.5px; font-weight:800; letter-spacing:.02em; }
    .hlni-backup-pill.ok { background:#e8f2ed; color:#23543d; }
    .hlni-backup-pill.pending { background:#f3ead9; color:#6b5328; }
    .hlni-backup-pill.fail { background:#f7e5e2; color:#7b352e; }
    .hlni-backup-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    .hlni-backup-card { border:1px solid rgba(31,59,50,.12); border-radius:16px; padding:14px; background:#fff; }
    .hlni-backup-card .eyebrow { margin-bottom:5px; }
    .hlni-backup-card h4 { margin:0 0 8px; color:#1f3b32; font-size:18px; font-family:Georgia,'Times New Roman',serif; }
    .hlni-backup-meta { display:grid; gap:5px; margin:10px 0 12px; color:#66716b; font-size:12px; line-height:1.45; }
    .hlni-backup-meta strong { color:#2c463d; font-weight:700; }
    .hlni-backup-actions { display:flex; flex-wrap:wrap; gap:8px; }
    .hlni-backup-actions .btn { flex:1 1 180px; }
    .hlni-backup-note { padding:12px 14px; border-radius:14px; background:rgba(184,145,69,.08); color:#5f634f; font-size:12px; line-height:1.55; }
    .hlni-backup-error { color:#8a3b31 !important; }
    @media (max-width:620px) {
      .hlni-backup-dialog { width:calc(100vw - 14px); max-height:92vh; }
      .hlni-backup-head { padding:17px 15px 11px; }
      .hlni-backup-body { padding:14px 15px 18px; }
      .hlni-backup-grid { grid-template-columns:1fr; }
      .hlni-backup-head h3 { font-size:23px; }
    }
  `;
  document.head.appendChild(style);
}

function prettyDate(value) {
  if (!value) return 'Belum ada';
  try {
    return new Intl.DateTimeFormat('ms-MY', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  } catch { return '—'; }
}

function prettySize(bytes) {
  const n = Number(bytes || 0);
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function ensureUI() {
  installStyles();
  const profile = document.querySelector('#view-profile .panel');
  if (profile && !document.getElementById('hlni-backup-open')) {
    const btn = document.createElement('button');
    btn.id = 'hlni-backup-open';
    btn.className = 'btn btn-secondary';
    btn.type = 'button';
    btn.textContent = 'Backup & Recovery';
    const archive = profile.querySelector('[data-nav="archive"]');
    if (archive) archive.insertAdjacentElement('afterend', btn);
    else profile.appendChild(btn);
    btn.addEventListener('click', openBackupDialog);
  }

  if (!document.getElementById('hlni-backup-dialog')) {
    const dialog = document.createElement('dialog');
    dialog.id = 'hlni-backup-dialog';
    dialog.className = 'hlni-backup-dialog';
    dialog.innerHTML = `
      <div class="hlni-backup-head">
        <div><p class="eyebrow">DATA PROTECTION</p><h3>Backup & Recovery</h3></div>
        <button id="hlni-backup-close" class="icon-btn" type="button" aria-label="Tutup">×</button>
      </div>
      <div class="hlni-backup-body">
        <section id="hlni-backup-system" class="hlni-backup-state"><p>Memuatkan status…</p></section>
        <div class="hlni-backup-grid">
          <section id="hlni-backup-database" class="hlni-backup-card"></section>
          <section id="hlni-backup-covers" class="hlni-backup-card"></section>
        </div>
        <div class="hlni-backup-actions">
          <button id="hlni-download-db" class="btn btn-primary" type="button">Download Database Backup</button>
          <button id="hlni-download-covers" class="btn btn-secondary" type="button">Download Cover Backup</button>
          <button id="hlni-backup-refresh" class="btn btn-secondary" type="button">Refresh Status</button>
        </div>
        <div class="hlni-backup-note">
          Database automatik direka untuk disimpan ke Google Drive akaun Home Library, 30 daily + 12 monthly. Cover menggunakan incremental mirror: cover yang baru/berubah akan ditambah ke Drive dan tidak dipadam secara automatik jika hilang daripada Supabase.
        </div>
      </div>`;
    document.body.appendChild(dialog);
    document.getElementById('hlni-backup-close').onclick = () => dialog.close();
    document.getElementById('hlni-backup-refresh').onclick = loadBackupStatus;
    document.getElementById('hlni-download-db').onclick = () => manualDownload('hlni-backup-export', 'database');
    document.getElementById('hlni-download-covers').onclick = () => manualDownload('hlni-cover-backup-export', 'covers');
  }
}

async function openBackupDialog() {
  ensureUI();
  const dialog = document.getElementById('hlni-backup-dialog');
  if (!dialog.open) dialog.showModal();
  await loadBackupStatus();
}

function renderRun(targetId, label, run) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const ok = run?.status === 'SUCCESS';
  const failed = run?.status === 'FAILED';
  el.innerHTML = `
    <p class="eyebrow">${esc(label)}</p>
    <h4>${esc(label === 'DATABASE' ? 'Database' : 'Cover Buku')}</h4>
    <div class="hlni-backup-meta">
      <span>Status: <strong class="${failed ? 'hlni-backup-error' : ''}">${run ? esc(run.status === 'SUCCESS' ? 'Berjaya' : run.status === 'FAILED' ? 'Gagal' : 'Sedang Jalan') : 'Belum ada rekod'}</strong></span>
      <span>Terakhir: <strong>${esc(prettyDate(run?.completed_at || run?.started_at))}</strong></span>
      <span>Fail: <strong>${esc(run?.file_name || '—')}</strong></span>
      <span>Saiz: <strong>${esc(prettySize(run?.file_size_bytes))}</strong></span>
      ${run?.item_count !== null && run?.item_count !== undefined ? `<span>Item: <strong>${esc(run.item_count)}</strong></span>` : ''}
      ${run?.error_message ? `<span class="hlni-backup-error">${esc(run.error_message)}</span>` : ''}
    </div>
    ${ok && run?.drive_url ? `<a class="btn btn-secondary btn-link" href="${esc(run.drive_url)}" target="_blank" rel="noopener">Buka di Google Drive</a>` : ''}`;
}

async function loadBackupStatus() {
  const system = document.getElementById('hlni-backup-system');
  if (!system) return;
  system.innerHTML = '<p>Memuatkan status backup…</p>';
  try {
    const [{ data: state, error: stateError }, { data: runs, error: runsError }] = await Promise.all([
      supabase.from('backup_system_state').select('*').eq('id', 1).maybeSingle(),
      supabase.from('backup_runs').select('*').order('created_at', { ascending: false }).limit(40)
    ]);
    if (stateError) throw stateError;
    if (runsError) throw runsError;

    const dbRun = (runs || []).find(r => r.backup_type === 'DATABASE');
    const coverRun = (runs || []).find(r => r.backup_type === 'COVERS');
    const enabled = state?.automation_enabled === true;
    system.innerHTML = `
      <div class="hlni-backup-state-row">
        <div>
          <h4>Google Drive Automation</h4>
          <p>${enabled ? `Aktif · heartbeat terakhir ${esc(prettyDate(state?.last_heartbeat_at))}` : 'Belum diaktifkan. Setup sekali menggunakan akaun Google Home Library.'}</p>
        </div>
        <span class="hlni-backup-pill ${enabled ? 'ok' : 'pending'}">${enabled ? 'AKTIF' : 'BELUM AKTIF'}</span>
      </div>`;
    renderRun('hlni-backup-database', 'DATABASE', dbRun);
    renderRun('hlni-backup-covers', 'COVERS', coverRun);
  } catch (error) {
    console.error('[HLNI Backup status]', error);
    system.innerHTML = `<div class="hlni-backup-state-row"><div><h4>Status tidak dapat dimuatkan</h4><p class="hlni-backup-error">${esc(error?.message || 'Cuba refresh semula.')}</p></div><span class="hlni-backup-pill fail">ERROR</span></div>`;
    renderRun('hlni-backup-database', 'DATABASE', null);
    renderRun('hlni-backup-covers', 'COVERS', null);
  }
}

async function manualDownload(functionName, kind) {
  const button = document.getElementById(kind === 'database' ? 'hlni-download-db' : 'hlni-download-covers');
  if (!button) return;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Sediakan backup…';
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Sesi login tidak ditemui. Log masuk semula dan cuba lagi.');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY
      },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Backup gagal disediakan (HTTP ${response.status}).`);

    const blob = await response.blob();
    if (!blob.size) throw new Error('Backup kosong.');
    const cd = response.headers.get('content-disposition') || '';
    const match = cd.match(/filename=?"?([^";]+)"?/i);
    const fallback = kind === 'database' ? 'HLNI_Database_Backup.json.gz' : 'HLNI_Covers_Backup.tar.gz';
    const filename = match?.[1] || fallback;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (error) {
    console.error('[HLNI Backup download]', error);
    const system = document.getElementById('hlni-backup-system');
    if (system) system.insertAdjacentHTML('beforeend', `<p class="hlni-backup-error" style="margin-top:8px">${esc(error?.message || 'Tak dapat download backup.')}</p>`);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function boot() {
  ensureUI();
  const observer = new MutationObserver(() => ensureUI());
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

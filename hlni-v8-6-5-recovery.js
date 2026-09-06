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

const STYLE_ID = 'hlni-v865-recovery-style';

function esc(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function prettyDate(value) {
  if (!value) return 'Belum divalidasi';
  try {
    return new Intl.DateTimeFormat('ms-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hlni-recovery-validation {
      border: 1px solid rgba(31,59,50,.12);
      border-radius: 16px;
      padding: 14px;
      background: #fff;
    }
    .hlni-recovery-head {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:12px;
    }
    .hlni-recovery-head h4 {
      margin:0 0 4px;
      color:#1f3b32;
      font-size:18px;
      font-family:Georgia,'Times New Roman',serif;
    }
    .hlni-recovery-head p {
      margin:0;
      color:#69736e;
      font-size:12px;
      line-height:1.5;
    }
    .hlni-recovery-badge {
      flex:0 0 auto;
      border-radius:999px;
      padding:6px 9px;
      font-size:10.5px;
      font-weight:800;
      letter-spacing:.02em;
    }
    .hlni-recovery-badge.pass { background:#e8f2ed; color:#23543d; }
    .hlni-recovery-badge.warn { background:#f3ead9; color:#6b5328; }
    .hlni-recovery-badge.fail { background:#f7e5e2; color:#7b352e; }
    .hlni-recovery-checks {
      margin-top:12px;
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
    }
    .hlni-recovery-check {
      border-radius:11px;
      background:#faf7ef;
      padding:9px 10px;
      font-size:11.5px;
      color:#66716b;
      line-height:1.4;
    }
    .hlni-recovery-check strong {
      display:block;
      color:#29463c;
      font-size:13px;
      margin-top:2px;
    }
    .hlni-recovery-hash {
      margin-top:10px;
      font-size:10.5px;
      color:#7a817d;
      overflow-wrap:anywhere;
    }
    .hlni-recovery-note {
      margin-top:10px;
      padding:10px 11px;
      border-radius:11px;
      background:rgba(184,145,69,.08);
      color:#5f634f;
      font-size:11.5px;
      line-height:1.5;
    }
    @media (max-width:620px) {
      .hlni-recovery-checks { grid-template-columns:1fr 1fr; }
    }
  `;
  document.head.appendChild(style);
}

function ensurePanel() {
  installStyles();
  const dialog = document.getElementById('hlni-backup-dialog');
  if (!dialog) return false;

  if (!document.getElementById('hlni-recovery-validation')) {
    const panel = document.createElement('section');
    panel.id = 'hlni-recovery-validation';
    panel.className = 'hlni-recovery-validation';
    panel.innerHTML = '<p>Memuatkan recovery validation…</p>';

    const actions = dialog.querySelector('.hlni-backup-actions');
    if (actions) actions.insertAdjacentElement('beforebegin', panel);
    else dialog.querySelector('.hlni-backup-body')?.appendChild(panel);
  }

  const refresh = document.getElementById('hlni-backup-refresh');
  if (refresh && refresh.dataset.recoveryBound !== '1') {
    refresh.dataset.recoveryBound = '1';
    refresh.addEventListener('click', () => setTimeout(loadRecoveryValidation, 80));
  }

  const open = document.getElementById('hlni-backup-open');
  if (open && open.dataset.recoveryBound !== '1') {
    open.dataset.recoveryBound = '1';
    open.addEventListener('click', () => setTimeout(loadRecoveryValidation, 100));
  }

  return true;
}

async function loadRecoveryValidation() {
  const panel = document.getElementById('hlni-recovery-validation');
  if (!panel) return;

  panel.innerHTML = '<p>Memuatkan recovery validation…</p>';

  try {
    const { data, error } = await supabase
      .from('backup_validations')
      .select('*')
      .order('validated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      panel.innerHTML = `
        <div class="hlni-recovery-head">
          <div>
            <h4>Recovery Validation</h4>
            <p>Belum ada backup yang diuji untuk recovery.</p>
          </div>
          <span class="hlni-recovery-badge warn">BELUM UJI</span>
        </div>`;
      return;
    }

    const checks = data.checks || {};
    const status = String(data.status || 'WARN').toUpperCase();
    const badgeClass = status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : 'warn';
    const badgeText = status === 'PASS' ? 'LULUS' : status === 'FAIL' ? 'GAGAL' : 'AMARAN';
    const orphanCount = Number(checks.orphan_relationships ?? 0);

    panel.innerHTML = `
      <div class="hlni-recovery-head">
        <div>
          <p class="eyebrow">RECOVERY VALIDATION</p>
          <h4>Backup Boleh Dibaca & Disemak</h4>
          <p>Ujian terakhir ${esc(prettyDate(data.validated_at))}</p>
        </div>
        <span class="hlni-recovery-badge ${badgeClass}">${badgeText}</span>
      </div>

      <div class="hlni-recovery-checks">
        <div class="hlni-recovery-check">Format Backup<strong>${esc(data.format_version || '—')}</strong></div>
        <div class="hlni-recovery-check">GZIP + JSON<strong>${checks.gzip_decompression === 'PASS' && checks.json_parse === 'PASS' ? 'Lulus' : 'Semak'}</strong></div>
        <div class="hlni-recovery-check">Judul Dalam Backup<strong>${esc(checks.books ?? '—')}</strong></div>
        <div class="hlni-recovery-check">Naskhah Dalam Backup<strong>${esc(checks.copies ?? '—')}</strong></div>
        <div class="hlni-recovery-check">Data Asal Access 2015<strong>${esc(checks.access_stage_rows ?? '—')} rekod</strong></div>
        <div class="hlni-recovery-check">Orphan Relationship<strong>${esc(orphanCount)}</strong></div>
      </div>

      <div class="hlni-recovery-hash">
        Fail: ${esc(data.backup_file_name || '—')}<br>
        SHA-256: ${esc(data.file_sha256 || '—')}
      </div>

      <div class="hlni-recovery-note">
        Data backup ini telah lulus ujian non-destructive. Ia melindungi data katalog, rekod Access yang dimigrasi, ulasan dan metadata berkaitan. Untuk disaster recovery penuh jika seluruh project Supabase hilang, schema PostgreSQL / functions / RLS dan akaun login perlu dipulihkan melalui lapisan backup berasingan.
      </div>`;
  } catch (error) {
    console.error('[HLNI Recovery Validation]', error);
    panel.innerHTML = `
      <div class="hlni-recovery-head">
        <div>
          <h4>Recovery Validation</h4>
          <p>${esc(error?.message || 'Status validation tak dapat dimuatkan.')}</p>
        </div>
        <span class="hlni-recovery-badge fail">ERROR</span>
      </div>`;
  }
}

function boot() {
  if (ensurePanel()) loadRecoveryValidation();

  const observer = new MutationObserver(() => {
    if (ensurePanel()) {
      const panel = document.getElementById('hlni-recovery-validation');
      if (panel && !panel.dataset.loadedOnce) {
        panel.dataset.loadedOnce = '1';
        loadRecoveryValidation();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

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

// -----------------------------------------------------------------------------
// HLNI Cover Optimizer v1.0.0
// Appended to the existing recovery module so family.html DOES NOT need editing.
// Compresses FUTURE manual cover uploads before the existing app.js upload flow.
// Existing DB, existing covers, public.html and app.js are untouched.
// -----------------------------------------------------------------------------

(() => {
  const TARGET_BYTES = 450 * 1024; // target <= 450 KB
  const MAX_WIDTH = 1200;
  const MAX_HEIGHT = 1800;

  function canvasBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  async function exportOptimizedCanvas(canvas, quality) {
    let blob = await canvasBlob(canvas, 'image/webp', quality);

    // Fallback for browsers that cannot export WebP.
    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasBlob(canvas, 'image/jpeg', quality);
    }

    if (!blob) throw new Error('Cover tak dapat diproses.');
    return blob;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => resolve({ img, objectUrl });
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Fail cover tak dapat dibaca.'));
      };

      img.src = objectUrl;
    });
  }

  async function optimizeCover(file) {
    const { img, objectUrl } = await loadImage(file);

    try {
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;

      if (!originalWidth || !originalHeight) {
        throw new Error('Resolusi cover tidak sah.');
      }

      // If already web-friendly, keep the exact original file.
      if (
        file.size <= TARGET_BYTES &&
        originalWidth <= MAX_WIDTH &&
        originalHeight <= MAX_HEIGHT
      ) {
        return file;
      }

      let scale = Math.min(
        1,
        MAX_WIDTH / originalWidth,
        MAX_HEIGHT / originalHeight
      );

      let width = Math.max(1, Math.round(originalWidth * scale));
      let height = Math.max(1, Math.round(originalHeight * scale));
      let bestBlob = null;

      for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt++) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Browser tak dapat proses cover.');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        for (const quality of [0.84, 0.78, 0.72, 0.66]) {
          const candidate = await exportOptimizedCanvas(canvas, quality);

          if (!bestBlob || candidate.size < bestBlob.size) {
            bestBlob = candidate;
          }

          if (candidate.size <= TARGET_BYTES) {
            bestBlob = candidate;
            break;
          }
        }

        if (bestBlob && bestBlob.size <= TARGET_BYTES) break;

        // Still too large: reduce dimensions another 15% and retry.
        width = Math.max(480, Math.round(width * 0.85));
        height = Math.max(720, Math.round(height * 0.85));
      }

      if (!bestBlob) return file;

      const ext = bestBlob.type === 'image/webp' ? 'webp' : 'jpg';
      const stem = (file.name || 'cover')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .slice(0, 80) || 'cover';

      return new File(
        [bestBlob],
        `${stem}-optimized.${ext}`,
        { type: bestBlob.type, lastModified: Date.now() }
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function setSubmitDisabled(input, disabled) {
    const form = input.form;
    if (!form) return;

    form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(btn => {
      if (disabled) {
        if (!btn.dataset.hlniOptimizerLock) {
          btn.dataset.hlniOptimizerWasDisabled = btn.disabled ? '1' : '0';
        }
        btn.dataset.hlniOptimizerLock = '1';
        btn.disabled = true;
      } else if (btn.dataset.hlniOptimizerLock) {
        if (btn.dataset.hlniOptimizerWasDisabled !== '1') btn.disabled = false;
        delete btn.dataset.hlniOptimizerLock;
        delete btn.dataset.hlniOptimizerWasDisabled;
      }
    });
  }

  async function handleCoverInput(input) {
    const file = input.files?.[0];
    if (!file) return;

    // Leave validation to the existing app.js for unsupported/oversized files.
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;

    // DataTransfer is needed to replace the selected File safely.
    // If unavailable, fail open: existing app.js continues working unchanged.
    if (typeof DataTransfer === 'undefined') {
      console.warn('[HLNI Cover Optimizer] DataTransfer unavailable; using original file.');
      return;
    }

    setSubmitDisabled(input, true);
    input.dataset.hlniOptimizing = '1';

    try {
      const originalBytes = file.size;
      const optimized = await optimizeCover(file);

      if (optimized !== file && optimized.size < file.size) {
        const dt = new DataTransfer();
        dt.items.add(optimized);
        input.files = dt.files;

        console.info('[HLNI Cover Optimizer]', {
          originalKB: Math.round(originalBytes / 1024),
          finalKB: Math.round(optimized.size / 1024),
          savedPercent: Math.round((1 - optimized.size / originalBytes) * 100),
          format: optimized.type
        });
      } else {
        console.info('[HLNI Cover Optimizer] Original cover already web-friendly.');
      }
    } catch (error) {
      // Never break the current upload flow before judging.
      console.error('[HLNI Cover Optimizer] Compression failed; original file retained.', error);
    } finally {
      delete input.dataset.hlniOptimizing;
      setSubmitDisabled(input, false);
    }
  }

  document.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type !== 'file' || input.name !== 'cover_file') return;

    handleCoverInput(input);
  }, true);

  console.info('[HLNI Cover Optimizer] v1.0.0 ready');
})();

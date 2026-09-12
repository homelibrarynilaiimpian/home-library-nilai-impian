import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://hpkzlioltmzyoalnqhgz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_57JvYsgIIi1LDnMYkew7XA_mOrQaZu2';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const MAP_URL = './map3d.html';
let currentBookId = null;

function esc(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stars(rating) {
  if (!rating) return '';
  const n = Math.round(Number(rating));
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
}

function friendlyCategory(name = '') {
  const m = String(name).match(/^([A-Z]{1,3})\s*·\s*(.+)$/);
  return m ? `${m[2]} (${m[1]})` : String(name);
}

function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `RM ${n.toFixed(2)}` : '—';
}

function publicDate(value) {
  if (!value) return '';
  const months = [
    'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
    'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
  ];
  try {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value));
    const d = dateOnly ? new Date(`${value}T12:00:00`) : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return '';
  }
}

function readingLabel(status = '') {
  return status === 'READ' ? 'Selesai Dibaca' : 'Sedang Baca';
}

function cover(url, cls = 'detail-cover') {
  return url
    ? `<img class="${cls}" src="${esc(url)}" alt="" loading="eager" onerror="this.outerHTML='<div class=&quot;${cls} cover-placeholder&quot;>HLNI</div>'">`
    : `<div class="${cls} cover-placeholder">HLNI</div>`;
}

function familyWorkBadge(book) {
  return book?.is_family_work ? '<span class="public-family-work-badge">Karya Keluarga</span>' : '';
}

function mapHref(book) {
  return book?.location_complete && book?.rack_no && book?.bay_no
    ? `${MAP_URL}?rack=${encodeURIComponent(book.rack_no)}&bay=${encodeURIComponent(book.bay_no)}`
    : MAP_URL;
}

function locationValue(book) {
  return book?.location_complete
    ? `Rak ${book.rack_no} • Bay ${book.bay_no}`
    : '—';
}

function mapButtonText(book) {
  return book?.location_complete ? '🧭 LIHAT LOKASI 3D' : '🗺️ LIHAT PETA 3D HLNI';
}

function ensureHeroMapButton() {
  const actions = document.querySelector('.public-hero-actions');
  if (!actions || actions.querySelector('[data-hlni-map-general]')) return;
  const a = document.createElement('a');
  a.href = MAP_URL;
  a.className = 'public-cta hlni-map-hero-btn';
  a.dataset.hlniMapGeneral = '1';
  a.textContent = 'Peta 3D HLNI';
  actions.appendChild(a);
}

async function loadReviews(bookId) {
  const wrap = document.querySelector('#public-family-reviews');
  if (!wrap || currentBookId !== bookId) return;

  try {
    const { data, error } = await supabase.rpc('public_book_reviews', { p_book_id: bookId });
    if (error) throw error;
    if (currentBookId !== bookId) return;

    const rows = data || [];
    if (!rows.length) {
      wrap.innerHTML = '<div class="empty compact">Belum ada ulasan keluarga untuk buku ini.</div>';
      return;
    }

    wrap.innerHTML = rows.map(r => `<article class="public-review-card public-review-card-detail">
      <div class="public-review-head">
        <div class="public-reviewer-line">
          <strong>${esc(r.reviewer_name || 'Family member')}</strong>
          ${r.rating ? `<span class="stars">${stars(r.rating)}</span>` : ''}
        </div>
        <span class="reading-badge ${esc(r.reading_status)}">${esc(readingLabel(r.reading_status))}</span>
      </div>
      ${r.review_text ? `<p class="review-preserve-lines">${esc(r.review_text)}</p>` : '<p class="muted">Tiada ulasan bertulis.</p>'}
      <small>${esc(
        r.finished_at ? `Selesai ${publicDate(r.finished_at)}`
        : r.started_at ? `Mula ${publicDate(r.started_at)}`
        : `Dikemaskini ${publicDate(r.updated_at)}`
      )}</small>
    </article>`).join('');
  } catch (error) {
    console.error('[HLNI Reviews]', error);
    if (wrap && currentBookId === bookId) {
      wrap.innerHTML = '<div class="empty compact">Ulasan keluarga tak dapat dimuatkan sekarang.</div>';
    }
  }
}

function renderDetail(book) {
  const detail = document.querySelector('#public-book-detail');
  if (!detail) return;

  const location = locationValue(book);
  const href = mapHref(book);
  const buttonText = mapButtonText(book);

  detail.innerHTML = `<div class="detail-top">
    ${cover(book.cover_url)}
    <div>
      <p class="eyebrow">KATALOG AWAM</p>
      <h3 class="detail-title">${esc(book.title)}</h3>
      <p class="detail-author">${esc(book.authors || 'Penulis tidak direkod')}</p>
      ${familyWorkBadge(book)}
      ${book.avg_rating ? `<div class="public-card-rating"><span class="stars">${stars(book.avg_rating)}</span> ${esc(book.avg_rating)} · ${Number(book.review_count) || 0} ulasan</div>` : ''}
    </div>
  </div>

  <div class="detail-grid public-six-info-grid">
    <div class="detail-item"><span>Penerbit</span><strong>${esc(book.publisher || '—')}</strong></div>
    <div class="detail-item"><span>Tahun</span><strong>${esc(book.publication_year || '—')}</strong></div>
    <div class="detail-item"><span>Kategori</span><strong>${esc((book.categories || []).map(friendlyCategory).join(', ') || 'Lain-lain')}</strong></div>
    <div class="detail-item"><span>Rak / Bay</span><strong>${esc(location)}</strong></div>
    <div class="detail-item"><span>Call No.</span><strong>${esc(book.call_no || '—')}</strong></div>
    <div class="detail-item"><span>Harga</span><strong>${esc(money(book.purchase_price))}</strong></div>
  </div>

  <div class="hlni-detail-location">
    <div>
      <span class="hlni-detail-location-label">NAVIGASI LOKASI</span>
      <strong>${esc(location)}</strong>
    </div>
    <a class="hlni-detail-map-btn" href="${esc(href)}">${esc(buttonText)}</a>
  </div>

  ${book.description ? `<section class="public-synopsis-section">
    <p class="eyebrow">SINOPSIS</p>
    <div class="book-description review-preserve-lines">${esc(book.description)}</div>
  </section>` : ''}

  <section class="public-review-section">
    <div><p class="eyebrow">ULASAN BUKU</p><h3>Ulasan Keluarga</h3></div>
    <div id="public-family-reviews"><div class="empty compact">Memuatkan ulasan…</div></div>
  </section>`;
}

async function openDetailFast(bookId) {
  const dialog = document.querySelector('#public-book-dialog');
  const detail = document.querySelector('#public-book-detail');
  if (!dialog || !detail || !bookId) return;

  currentBookId = bookId;
  detail.innerHTML = '<div class="empty compact">Memuatkan info buku…</div>';
  if (!dialog.open) dialog.showModal();

  try {
    const { data, error } = await supabase.rpc('public_book_detail_location_v1', { p_book_id: bookId });
    if (error) throw error;
    if (currentBookId !== bookId) return;

    const book = data?.[0] || data || null;
    if (!book?.id) throw new Error('Rekod buku tidak dijumpai.');

    renderDetail(book);
    loadReviews(bookId);
  } catch (error) {
    console.error('[HLNI Public Detail]', error);
    if (currentBookId === bookId) {
      detail.innerHTML = `<div class="empty compact">${esc(error?.message || 'Info buku tak dapat dimuatkan sekarang.')}</div>`;
    }
  }
}

// Take over book-detail clicks so the old slower detail request does not run in parallel.
document.addEventListener('click', event => {
  const trigger = event.target.closest?.('[data-public-book], [data-public-review-book]');
  if (!trigger) return;

  const bookId = trigger.dataset.publicBook || trigger.dataset.publicReviewBook;
  if (!bookId) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  openDetailFast(bookId);
}, true);

const closeBtn = document.querySelector('#public-close-dialog');
closeBtn?.addEventListener('click', () => {
  currentBookId = null;
  const dialog = document.querySelector('#public-book-dialog');
  if (dialog?.open) dialog.close();
});

ensureHeroMapButton();

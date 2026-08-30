import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://hpkzlioltmzyoalnqhgz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_57JvYsgIIi1LDnMYkew7XA_mOrQaZu2';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = {
  query: '',
  category: null,
  sort: 'TITLE_ASC',
  offset: 0,
  limit: 40,
  total: 0,
  books: new Map(),
  familyWorks: new Map(),
  loading: false,
  publicView: 'catalogue',
  reviewQuery: '',
  reviewRating: '',
  reviewLoading: false,
  worksLoading: false
};

function esc(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cover(url, cls = 'public-cover') {
  return url
    ? `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;${cls} cover-placeholder&quot;>HLNI</div>'">`
    : `<div class="${cls} cover-placeholder">HLNI</div>`;
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

function chips(names = []) {
  return names?.length
    ? `<div class="mini-categories">${names.slice(0, 3).map(x => `<span>${esc(friendlyCategory(x))}</span>`).join('')}</div>`
    : '';
}

function readingLabel(status = '') {
  return status === 'READ' ? 'Selesai Dibaca' : 'Sedang Baca';
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

function setupPending(error) {
  const msg = (error?.message || '').toLowerCase();
  return /public_catalogue_stats_v8|public_catalogue_search_v8|public_family_reviews|function|is_family_work/.test(msg)
    && /not find|does not exist|schema cache|column/.test(msg);
}

async function loadStats() {
  const { data, error } = await supabase.rpc('public_catalogue_stats_v8');
  if (error) {
    console.error(error);
    return;
  }
  const s = data?.[0] || data || {};
  $('#public-stat-titles').textContent = s.total_titles ?? 0;
  $('#public-stat-categories').textContent = s.total_categories ?? 0;
  $('#public-stat-reads').textContent = s.family_reads ?? 0;
  $('#public-stat-family-works').textContent = s.family_work_count ?? 0;
}

async function loadCategories() {
  const { data, error } = await supabase.rpc('public_catalogue_categories');
  if (error) {
    console.error(error);
    return;
  }
  $('#public-category').innerHTML = '<option value="">Semua kategori</option>' + (data || []).map(c =>
    `<option value="${c.id}">${esc(friendlyCategory(c.name))}${Number(c.book_count) ? ` (${c.book_count})` : ''}</option>`
  ).join('');
}

function familyWorkBadge(book) {
  return book?.is_family_work ? '<span class="public-family-work-badge">Karya Keluarga</span>' : '';
}

function card(book) {
  return `<button class="public-book-card" data-public-book="${book.id}">
    ${cover(book.cover_url)}
    <div class="public-book-card-main">
      <div class="public-book-title-line"><h3>${esc(book.title)}</h3>${familyWorkBadge(book)}</div>
      <p>${esc(book.authors || 'Penulis tidak direkod')}</p>
      <div class="public-card-meta">${[book.publisher, book.publication_year].filter(Boolean).map(esc).join(' · ')}</div>
      ${chips(book.categories)}
      ${book.avg_rating ? `<div class="public-card-rating"><span class="stars">${stars(book.avg_rating)}</span> ${esc(book.avg_rating)}${Number(book.review_count) ? ` · ${book.review_count} ulasan` : ''}</div>` : ''}
    </div>
  </button>`;
}

function getBook(id) {
  return state.books.get(id) || state.familyWorks.get(id) || null;
}

function bindCards(root = document) {
  $$('[data-public-book]', root).forEach(el => {
    el.onclick = () => openDetail(el.dataset.publicBook);
  });
}

async function searchCatalogue({ append = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  const btn = $('#public-load-more');
  btn.disabled = true;

  if (!append) {
    state.offset = 0;
    state.books.clear();
    $('#public-grid').innerHTML = '<div class="empty">Memuatkan katalog…</div>';
  }

  try {
    const { data, error } = await supabase.rpc('public_catalogue_search_v8', {
      p_query: state.query || null,
      p_category: state.category || null,
      p_family_only: false,
      p_sort: state.sort,
      p_limit: state.limit,
      p_offset: state.offset
    });
    if (error) throw error;

    const rows = data || [];
    if (!append) $('#public-grid').innerHTML = '';
    rows.forEach(book => state.books.set(book.id, book));
    $('#public-grid').insertAdjacentHTML('beforeend', rows.map(card).join(''));
    bindCards($('#public-grid'));

    state.total = Number(rows?.[0]?.total_count || 0);
    state.offset += rows.length;
    $('#public-meta').textContent = `${state.total.toLocaleString('ms-MY')} judul${state.query ? ` · carian “${state.query}”` : ''}`;
    btn.classList.toggle('hidden', state.offset >= state.total || rows.length === 0);
    if (!state.total) $('#public-grid').innerHTML = '<div class="empty">Tiada buku yang sepadan.</div>';
  } catch (error) {
    console.error(error);
    $('#public-meta').textContent = setupPending(error) ? 'Katalog awam sedang dikemaskini.' : 'Tak dapat load katalog sekarang.';
    $('#public-grid').innerHTML = setupPending(error)
      ? '<div class="empty">Run SQL HLNI FINAL V8 dahulu, kemudian refresh page.</div>'
      : '<div class="empty">Sila cuba refresh sebentar lagi.</div>';
  } finally {
    state.loading = false;
    btn.disabled = false;
  }
}

async function loadFamilyWorks() {
  if (state.worksLoading) return;
  state.worksLoading = true;
  const grid = $('#public-familyworks-grid');
  const meta = $('#public-familyworks-meta');
  grid.innerHTML = '<div class="empty">Memuatkan karya keluarga…</div>';
  try {
    const { data, error } = await supabase.rpc('public_catalogue_search_v8', {
      p_query: null,
      p_category: null,
      p_family_only: true,
      p_sort: 'TITLE_ASC',
      p_limit: 200,
      p_offset: 0
    });
    if (error) throw error;
    const rows = data || [];
    state.familyWorks.clear();
    rows.forEach(book => state.familyWorks.set(book.id, book));
    const total = Number(rows?.[0]?.total_count || 0);
    meta.textContent = `${total.toLocaleString('ms-MY')} karya keluarga`;
    grid.innerHTML = rows.length ? rows.map(card).join('') : '<div class="empty">Belum ada buku yang ditandakan sebagai Karya Keluarga.</div>';
    bindCards(grid);
  } catch (error) {
    console.error(error);
    meta.textContent = 'Tak dapat load Karya Keluarga sekarang.';
    grid.innerHTML = setupPending(error)
      ? '<div class="empty">Run SQL HLNI FINAL V8 dahulu untuk aktifkan Karya Keluarga.</div>'
      : '<div class="empty">Sila cuba refresh sebentar lagi.</div>';
  } finally {
    state.worksLoading = false;
  }
}

async function loadPublicBookReviews(bookId) {
  const wrap = $('#public-family-reviews');
  if (!wrap) return;
  const { data, error } = await supabase.rpc('public_book_reviews', { p_book_id: bookId });
  if (error) {
    console.error(error);
    wrap.innerHTML = '<div class="empty compact">Ulasan keluarga tak dapat dimuatkan sekarang.</div>';
    return;
  }
  const rows = data || [];
  if (!rows.length) {
    wrap.innerHTML = '<div class="empty compact">Belum ada ulasan keluarga untuk buku ini.</div>';
    return;
  }
  wrap.innerHTML = rows.map(r => `<article class="public-review-card public-review-card-detail">
    <div class="public-review-head">
      <div class="public-reviewer-line"><strong>${esc(r.reviewer_name || 'Family member')}</strong>${r.rating ? `<span class="stars">${stars(r.rating)}</span>` : ''}</div>
      <span class="reading-badge ${esc(r.reading_status)}">${esc(readingLabel(r.reading_status))}</span>
    </div>
    ${r.review_text ? `<p>${esc(r.review_text)}</p>` : '<p class="muted">Tiada ulasan bertulis.</p>'}
    <small>${esc(r.finished_at ? `Selesai ${publicDate(r.finished_at)}` : r.started_at ? `Mula ${publicDate(r.started_at)}` : `Dikemaskini ${publicDate(r.updated_at)}`)}</small>
  </article>`).join('');
}

function openDetail(id) {
  const book = getBook(id);
  if (!book) return;
  $('#public-book-detail').innerHTML = `<div class="detail-top">
    ${cover(book.cover_url, 'detail-cover')}
    <div>
      <p class="eyebrow">KATALOG AWAM</p>
      <h3 class="detail-title">${esc(book.title)}</h3>
      <p class="detail-author">${esc(book.authors || 'Penulis tidak direkod')}</p>
      ${familyWorkBadge(book)}
      ${chips(book.categories)}
      ${book.avg_rating ? `<div class="public-card-rating"><span class="stars">${stars(book.avg_rating)}</span> ${esc(book.avg_rating)} · ${Number(book.review_count) || 0} ulasan</div>` : ''}
    </div>
  </div>
  <div class="detail-grid">
    <div class="detail-item"><span>Penerbit</span><strong>${esc(book.publisher || '—')}</strong></div>
    <div class="detail-item"><span>Tahun</span><strong>${esc(book.publication_year || '—')}</strong></div>
    <div class="detail-item"><span>Kategori</span><strong>${esc((book.categories || []).map(friendlyCategory).join(', ') || 'Lain-lain')}</strong></div>
  </div>
  <section class="public-review-section">
    <div><p class="eyebrow">ULASAN BUKU</p><h3>Ulasan Keluarga</h3></div>
    <div id="public-family-reviews"><div class="empty compact">Memuatkan ulasan…</div></div>
  </section>`;
  $('#public-book-dialog').showModal();
  loadPublicBookReviews(id);
}

function publicReviewCard(review) {
  const date = review.finished_at
    ? `Selesai ${publicDate(review.finished_at)}`
    : review.started_at
      ? `Mula ${publicDate(review.started_at)}`
      : `Dikemaskini ${publicDate(review.updated_at)}`;
  const reviewText = review.review_text || '';
  const needsExpand = reviewText.length > 160;
  return `<article class="public-reading-card public-review-list-card" data-review-card="${review.review_id}">
    ${cover(review.cover_url, 'reading-cover')}
    <div class="public-reading-main">
      <div class="public-reading-book">
        <h3>${esc(review.title)}</h3>
        <p>${esc(review.authors || 'Penulis tidak direkod')}${review.publication_year ? ` · ${esc(review.publication_year)}` : ''}</p>
      </div>
      <div class="public-review-head public-review-list-head">
        <div class="public-reviewer-line"><strong>${esc(review.reviewer_name || 'Family member')}</strong>${review.rating ? `<span class="stars">${stars(review.rating)}</span>` : ''}</div>
        <span class="reading-badge ${esc(review.reading_status)}">${esc(readingLabel(review.reading_status))}</span>
      </div>
      ${reviewText ? `<p class="public-reading-review review-text-clamp">${esc(reviewText)}</p>${needsExpand ? '<button class="review-expand-btn" type="button" data-review-expand>Baca ulasan penuh →</button>' : ''}` : '<p class="muted">Tiada ulasan bertulis.</p>'}
      <small>${esc(date)}</small>
    </div>
  </article>`;
}

function bindReviewExpanders() {
  $$('[data-review-expand]').forEach(btn => {
    btn.onclick = () => {
      const card = btn.closest('[data-review-card]');
      const text = card?.querySelector('.review-text-clamp');
      if (!text) return;
      const expanded = text.classList.toggle('expanded');
      btn.textContent = expanded ? 'Tutup ulasan ↑' : 'Baca ulasan penuh →';
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    };
  });
}

async function loadPublicReviews() {
  if (state.reviewLoading) return;
  state.reviewLoading = true;
  const list = $('#public-reading-list');
  const meta = $('#public-reading-meta');
  list.innerHTML = '<div class="empty">Memuatkan ulasan…</div>';
  try {
    const { data, error } = await supabase.rpc('public_family_reviews', {
      p_query: state.reviewQuery || null,
      p_status: null,
      p_rating: state.reviewRating ? Number(state.reviewRating) : null,
      p_limit: 100,
      p_offset: 0
    });
    if (error) throw error;
    const rows = data || [];
    const total = Number(rows?.[0]?.total_count || 0);
    meta.textContent = `${total.toLocaleString('ms-MY')} ulasan${state.reviewQuery ? ` · carian “${state.reviewQuery}”` : ''}`;
    list.innerHTML = rows.length ? rows.map(publicReviewCard).join('') : '<div class="empty">Belum ada ulasan yang sepadan.</div>';
    bindReviewExpanders();
  } catch (error) {
    console.error(error);
    meta.textContent = 'Tak dapat load Ulasan Buku sekarang.';
    list.innerHTML = setupPending(error)
      ? '<div class="empty">Run SQL HLNI FINAL V8 dahulu, kemudian refresh page.</div>'
      : '<div class="empty">Sila cuba refresh sebentar lagi.</div>';
  } finally {
    state.reviewLoading = false;
  }
}

function setPublicView(view, { scroll = false } = {}) {
  state.publicView = ['catalogue', 'reviews', 'familyworks'].includes(view) ? view : 'catalogue';
  $('#public-view-catalogue').classList.toggle('hidden', state.publicView !== 'catalogue');
  $('#public-view-reviews').classList.toggle('hidden', state.publicView !== 'reviews');
  $('#public-view-familyworks').classList.toggle('hidden', state.publicView !== 'familyworks');
  $$('[data-public-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.publicView === state.publicView));
  if (state.publicView === 'reviews') loadPublicReviews();
  if (state.publicView === 'familyworks') loadFamilyWorks();
  if (scroll) $('#public-section-nav')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let searchTimer;
$('#public-search').addEventListener('input', e => {
  state.query = e.target.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchCatalogue(), 280);
});

$('#public-category').addEventListener('change', e => {
  state.category = e.target.value || null;
  searchCatalogue();
});

$('#public-sort').addEventListener('change', e => {
  state.sort = e.target.value || 'TITLE_ASC';
  searchCatalogue();
});

$('#public-load-more').addEventListener('click', () => searchCatalogue({ append: true }));
$('#public-close-dialog').addEventListener('click', () => $('#public-book-dialog').close());
$$('[data-public-view]').forEach(btn => btn.addEventListener('click', () => setPublicView(btn.dataset.publicView)));

let reviewTimer;
$('#public-reading-search').addEventListener('input', e => {
  state.reviewQuery = e.target.value.trim();
  clearTimeout(reviewTimer);
  reviewTimer = setTimeout(() => loadPublicReviews(), 280);
});

$$('[data-public-review-rating]').forEach(btn => btn.addEventListener('click', () => {
  state.reviewRating = btn.dataset.publicReviewRating || '';
  $$('[data-public-review-rating]').forEach(x => x.classList.toggle('active', x === btn));
  loadPublicReviews();
}));

$('#public-cta-browse')?.addEventListener('click', () => setPublicView('catalogue', { scroll: true }));

await Promise.all([loadStats(), loadCategories()]);
await searchCatalogue();

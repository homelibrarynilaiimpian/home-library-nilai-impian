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

const state = {
  user: null,
  profile: null,
  books: [],
  categories: [],
  archivedCopies: [],
  catalogueFilter: 'ALL',
  catalogueCategory: 'ALL',
  selected: null,
  round2Ready: true,
  lastLookupMeta: null,
  scanner: null
};

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

function toast(message, isError = false) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}

function esc(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(Number(value));
}

function prettyDate(value, withTime = false) {
  if (!value) return '—';
  const opts = withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('ms-MY', opts).format(new Date(value));
}

function authorNames(book) {
  const names = (book?.book_authors || []).map(x => x?.author?.name).filter(Boolean);
  return names.length ? names.join(', ') : 'Penulis tidak direkod';
}

function categoryNames(book) {
  return (book?.book_categories || []).map(x => x?.category?.name).filter(Boolean);
}

function firstCopy(book) {
  return (book?.copies || []).find(c => !c.archived_at) || book?.copies?.[0] || null;
}

function coverHTML(url, className = 'book-cover') {
  if (url) {
    return `<img class="${className}" src="${esc(url)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;${className} cover-placeholder&quot;>HLNI</div>'">`;
  }
  return `<div class="${className} cover-placeholder">HLNI</div>`;
}

function statusLabel(status = 'AVAILABLE') {
  return ({ AVAILABLE: 'Tersedia', BORROWED: 'Dipinjam', MISSING: 'Hilang', REPAIR: 'Baiki', ARCHIVED: 'Archive' })[status] || status;
}

function readingStatusLabel(status = 'WANT_TO_READ') {
  return ({ WANT_TO_READ: 'Nak Baca', READING: 'Sedang Baca', READ: 'Selesai Baca', DNF: 'Tak Dihabiskan' })[status] || status;
}

function ratingStars(rating) {
  if (!rating) return '';
  return '★'.repeat(Number(rating)) + '☆'.repeat(Math.max(0, 5 - Number(rating)));
}

function categoryChips(book) {
  const names = categoryNames(book);
  if (!names.length) return '';
  return `<div class="category-chips">${names.map(name => `<span>${esc(name)}</span>`).join('')}</div>`;
}

function bookRow(book) {
  const copy = firstCopy(book);
  const shelf = copy?.shelf?.code || copy?.shelf?.name || '';
  const meta = [authorNames(book), book.publication_year, shelf].filter(Boolean).join(' · ');
  const cats = categoryNames(book).slice(0, 2);
  return `<button class="book-row" data-book="${book.id}">
    ${coverHTML(book.cover_url)}
    <div class="book-main">
      <div class="book-title">${esc(book.title)}</div>
      <div class="book-sub">${esc(meta)}</div>
      ${cats.length ? `<div class="mini-categories">${cats.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
      ${copy ? `<span class="status ${esc(copy.status)}">${esc(statusLabel(copy.status))}</span>` : ''}
    </div>
    <span class="chev">›</span>
  </button>`;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function normalizeEmail(value = '') { return value.trim().toLowerCase(); }
function authErrorInfo(error) { return { name: error?.name || '', code: error?.code || '', status: Number(error?.status || 0), message: error?.message || '' }; }
function logAuthError(context, error) { console.error(`[HLNI Auth] ${context}`, authErrorInfo(error), error); }
function isRetryableAuthError(error) {
  const { status, code } = authErrorInfo(error);
  return status === 0 || status >= 500 || ['request_timeout', 'unexpected_failure'].includes(code);
}

function friendlyAuthError(error, action = 'login') {
  const { status, code, message } = authErrorInfo(error);
  if (status === 429 || ['over_request_rate_limit', 'over_email_send_rate_limit'].includes(code)) {
    return action === 'email'
      ? 'Had penghantaran email sementara dicapai. Tunggu seketika dan cuba semula. Login biasa masih boleh digunakan.'
      : 'Terlalu banyak cubaan log masuk dalam masa singkat. Tunggu seketika dan cuba lagi.';
  }
  if (code === 'invalid_credentials') return 'Email atau password tidak sepadan. Pastikan guna password terbaru yang telah ditetapkan.';
  if (code === 'email_not_confirmed') return 'Email ini belum disahkan. Buka link invitation/confirmation dahulu.';
  if (code === 'user_banned') return 'Akaun ini tidak aktif. Hubungi pentadbir Home Library.';
  if (status >= 500) return 'Servis login sedang terganggu seketika. Cuba lagi dalam beberapa saat.';
  if (/fetch|network|offline/i.test(message)) return 'Sambungan internet terganggu. Semak internet dan cuba lagi.';
  return message || 'Log masuk gagal. Cuba semula.';
}

async function runAuthRequest(operation, { retries = 1 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await operation();
      if (result?.error) {
        lastError = result.error;
        if (attempt < retries && isRetryableAuthError(result.error)) {
          await sleep(700 * (attempt + 1));
          continue;
        }
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryableAuthError(error)) {
        await sleep(700 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  return { data: null, error: lastError };
}

function isRound2Missing(error) {
  const msg = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST200' || /book_categories|book_reviews|categories/.test(msg) && /does not exist|relationship|schema cache/.test(msg);
}

async function ensureFamilyAccess(user) {
  const { data, error } = await supabase.from('family_members').select('active').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data?.active === true;
}

async function ensureFamilyAccessWithRetry(user) {
  let lastError;
  for (let i = 0; i < 3; i++) {
    try { return await ensureFamilyAccess(user); }
    catch (error) { lastError = error; if (i < 2) await sleep(500 * (i + 1)); }
  }
  throw lastError;
}

async function loadProfile() {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
  if (error) throw error;
  state.profile = data || { id: state.user.id, display_name: state.user.email?.split('@')[0] };
  const name = state.profile?.display_name || state.user.email?.split('@')[0] || 'H';
  $('#profile-initial').textContent = name.trim().charAt(0).toUpperCase();
  $('#profile-name').value = state.profile?.display_name || '';
  $('#profile-email').value = state.user.email || '';
}

async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('id,name,slug').is('archived_at', null).order('name');
  if (error) {
    if (isRound2Missing(error)) {
      state.round2Ready = false;
      state.categories = [];
      renderCategoryFilter();
      return;
    }
    console.error(error);
    return;
  }
  state.round2Ready = true;
  state.categories = data || [];
  renderCategoryFilter();
}

function renderCategoryFilter() {
  const select = $('#category-filter');
  if (!select) return;
  const current = state.catalogueCategory;
  select.innerHTML = `<option value="ALL">Semua kategori</option><option value="UNCATEGORIZED">Belum berkategori</option>${state.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}`;
  select.value = [...select.options].some(o => o.value === current) ? current : 'ALL';
}

async function enterAppForUser(user) {
  const allowed = await ensureFamilyAccessWithRetry(user);
  if (!allowed) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('Email ini belum diluluskan sebagai ahli keluarga.');
  }
  state.user = user;
  await loadProfile();
  showApp();
  await loadCategories();
  await Promise.all([loadDashboard(), loadCatalogue(), loadActivity()]);
}

async function bootstrap() {
  const passwordSetupRequested = location.hash.includes('type=recovery') || location.hash.includes('type=invite');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) logAuthError('getSession', sessionError);
  if (passwordSetupRequested && session) { state.user = session.user; showAuthReset(); return; }
  if (!session) { showAuthLogin(); return; }
  try {
    const { data: userData, error: userError } = await runAuthRequest(() => supabase.auth.getUser(), { retries: 1 });
    if (userError) throw userError;
    await enterAppForUser(userData?.user || session.user);
  } catch (err) {
    logAuthError('bootstrap', err);
    const { status, code } = authErrorInfo(err);
    if (status === 401 || code === 'session_not_found' || code === 'refresh_token_not_found' || code === 'refresh_token_already_used') {
      await supabase.auth.signOut({ scope: 'local' });
      showAuthLogin();
      toast('Sesi telah tamat. Log masuk semula.', true);
      return;
    }
    state.user = session.user;
    showAuthLogin();
    toast(friendlyAuthError(err, 'login'), true);
  }
}

function setAuthMode(mode) {
  $('#auth-screen').classList.remove('hidden');
  $('#app-shell').classList.add('hidden');
  $('#login-form').classList.toggle('hidden', mode !== 'login');
  $('#forgot-form').classList.toggle('hidden', mode !== 'forgot');
  $('#reset-password-form').classList.toggle('hidden', mode !== 'reset');
}
function showAuthLogin() { setAuthMode('login'); }
function showAuthForgot() { const current = $('#login-email').value.trim(); if (current) $('#forgot-email').value = current; setAuthMode('forgot'); }
function showAuthReset() { setAuthMode('reset'); }

function showApp() {
  $('#auth-screen').classList.add('hidden');
  $('#app-shell').classList.remove('hidden');
  const hash = location.hash.replace('#', '');
  navigate(['home', 'catalogue', 'add', 'activity', 'profile', 'archive'].includes(hash) ? hash : 'home', false);
}

async function navigate(name, updateHash = true) {
  const valid = ['home', 'catalogue', 'add', 'activity', 'profile', 'archive'];
  if (!valid.includes(name)) name = 'home';
  if (name !== 'add') await stopScanner();
  $$('.view').forEach(v => v.classList.add('hidden'));
  $(`#view-${name}`).classList.remove('hidden');
  const navName = name === 'archive' ? 'profile' : name;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === navName));
  const titles = { home: 'Library', catalogue: 'Katalog', add: 'Tambah Buku', activity: 'Aktiviti', profile: 'Profile', archive: 'Archive & Trash' };
  $('#page-title').textContent = titles[name];
  if (updateHash) history.replaceState(null, '', `#${name}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'catalogue') renderCatalogue();
  if (name === 'activity') loadActivity();
  if (name === 'archive') loadArchive();
}

async function loadDashboard() {
  const q = [
    supabase.from('books').select('id', { count: 'exact', head: true }).is('archived_at', null),
    supabase.from('copies').select('id', { count: 'exact', head: true }).is('archived_at', null),
    supabase.from('copies').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'AVAILABLE'),
    supabase.from('copies').select(`id,created_at,status,accession_no,book:books(id,title,publication_year,cover_url,book_authors(author:authors(name))),shelf:shelves(code,name)`).is('archived_at', null).order('created_at', { ascending: false }).limit(6)
  ];
  const [titles, copies, available, latest] = await Promise.all(q);
  if (titles.error || copies.error || available.error || latest.error) {
    console.error(titles.error || copies.error || available.error || latest.error);
    return;
  }
  $('#stat-titles').textContent = titles.count ?? 0;
  $('#stat-copies').textContent = copies.count ?? 0;
  $('#stat-available').textContent = available.count ?? 0;
  const list = $('#latest-list');
  if (!latest.data?.length) list.innerHTML = '<div class="empty">Belum ada buku. Tambah buku pertama melalui menu <strong>Tambah</strong>.</div>';
  else {
    list.innerHTML = latest.data.map(x => {
      const b = x.book;
      if (!b) return '';
      return bookRow({ ...b, copies: [{ ...x, shelf: x.shelf }], book_categories: [] });
    }).join('');
    bindBookRows();
  }
  await loadReadingDashboard();
}

async function loadReadingDashboard() {
  const stat = $('#stat-read');
  const feed = $('#recent-reading-list');
  if (!stat || !feed) return;
  const [countRes, recentRes] = await Promise.all([
    supabase.from('book_reviews').select('id', { count: 'exact', head: true }).eq('reading_status', 'READ'),
    supabase.from('book_reviews').select(`id,reading_status,rating,review_text,updated_at,reviewer:profiles(display_name),book:books(id,title,cover_url,publication_year)`).order('updated_at', { ascending: false }).limit(6)
  ]);
  if (countRes.error || recentRes.error) {
    if (isRound2Missing(countRes.error || recentRes.error)) {
      state.round2Ready = false;
      stat.textContent = '—';
      feed.innerHTML = '<div class="empty compact">Aktif selepas Round 2 database patch dijalankan.</div>';
      return;
    }
    console.error(countRes.error || recentRes.error);
    return;
  }
  stat.textContent = countRes.count ?? 0;
  const rows = recentRes.data || [];
  if (!rows.length) {
    feed.innerHTML = '<div class="empty compact">Belum ada rekod bacaan family. Buka mana-mana buku dan tambah status bacaan.</div>';
    return;
  }
  feed.innerHTML = rows.map(r => `<button class="reading-feed-row" data-book="${r.book?.id || ''}">
    ${coverHTML(r.book?.cover_url, 'reading-cover')}
    <div><strong>${esc(r.reviewer?.display_name || 'Family member')} · ${esc(readingStatusLabel(r.reading_status))}</strong><p>${esc(r.book?.title || 'Buku')} ${r.rating ? `· <span class="stars">${ratingStars(r.rating)}</span>` : ''}</p></div>
    <span class="chev">›</span>
  </button>`).join('');
  $$('[data-book]', feed).forEach(el => el.onclick = () => openBook(el.dataset.book));
}

const CATALOGUE_PAGE_SIZE = 500;
const BASE_SELECT = `id,title,isbn_10,isbn_13,publication_year,language,description,cover_url,created_at,archived_at,publisher:publishers(id,name),book_authors(id,author_order,author:authors(id,name)),copies(id,accession_no,owner_label,acquisition_date,purchase_price,purchased_from,condition,status,notes,legacy_serial_no,legacy_call_no,created_at,archived_at,shelf:shelves(id,code,name,room,section,shelf_number),collection:collections(id,name))`;
const ROUND2_SELECT = `id,title,isbn_10,isbn_13,publication_year,language,description,cover_url,created_at,archived_at,publisher:publishers(id,name),book_authors(id,author_order,author:authors(id,name)),book_categories(category:categories(id,name,slug)),copies(id,accession_no,owner_label,acquisition_date,purchase_price,purchased_from,condition,status,notes,legacy_serial_no,legacy_call_no,created_at,archived_at,shelf:shelves(id,code,name,room,section,shelf_number),collection:collections(id,name))`;

async function loadCatalogue() {
  const allBooks = [];
  let withRound2 = state.round2Ready;
  for (let from = 0; ; from += CATALOGUE_PAGE_SIZE) {
    const to = from + CATALOGUE_PAGE_SIZE - 1;
    let result = await supabase.from('books').select(withRound2 ? ROUND2_SELECT : BASE_SELECT).is('archived_at', null).order('title', { ascending: true }).order('id', { ascending: true }).range(from, to);
    if (result.error && withRound2 && isRound2Missing(result.error)) {
      state.round2Ready = false;
      withRound2 = false;
      result = await supabase.from('books').select(BASE_SELECT).is('archived_at', null).order('title', { ascending: true }).order('id', { ascending: true }).range(from, to);
    }
    if (result.error) {
      console.error(result.error);
      toast('Tak dapat load katalog.', true);
      return;
    }
    allBooks.push(...(result.data || []));
    if (!result.data || result.data.length < CATALOGUE_PAGE_SIZE) break;
  }
  state.books = allBooks.map(b => ({
    ...b,
    book_categories: b.book_categories || [],
    copies: (b.copies || []).filter(c => !c.archived_at)
  }));
  renderCatalogue();
}

function renderCatalogue() {
  const q = $('#catalogue-search')?.value?.trim().toLowerCase() || '';
  const filtered = state.books.filter(book => {
    const copy = firstCopy(book);
    const cats = categoryNames(book);
    const hay = [book.title, authorNames(book), book.isbn_13, book.isbn_10, book.publisher?.name, copy?.accession_no, copy?.shelf?.code, ...cats].filter(Boolean).join(' ').toLowerCase();
    const matchQ = !q || hay.includes(q);
    const matchStatus = state.catalogueFilter === 'ALL' || book.copies.some(c => c.status === state.catalogueFilter);
    const matchCategory = state.catalogueCategory === 'ALL'
      || (state.catalogueCategory === 'UNCATEGORIZED' ? cats.length === 0 : (book.book_categories || []).some(x => x.category?.id === state.catalogueCategory));
    return matchQ && matchStatus && matchCategory;
  });
  $('#catalogue-meta').textContent = `${filtered.length} judul${state.catalogueCategory === 'UNCATEGORIZED' ? ' · belum berkategori' : ''}`;
  $('#catalogue-list').innerHTML = filtered.length ? filtered.map(bookRow).join('') : '<div class="empty">Tiada rekod yang sepadan.</div>';
  bindBookRows();
}

function bindBookRows() {
  $$('[data-book]').forEach(el => { if (el.dataset.book) el.onclick = () => openBook(el.dataset.book); });
}

async function openBook(id) {
  const book = state.books.find(b => b.id === id);
  if (!book) { await loadCatalogue(); const found = state.books.find(b => b.id === id); if (found) return openBook(id); return; }
  state.selected = book;
  const copy = firstCopy(book);
  $('#book-detail').innerHTML = `<div class="detail-wrap">
    <div class="detail-top">${coverHTML(book.cover_url, 'detail-cover')}<div><p class="eyebrow">BOOK RECORD</p><h3 class="detail-title">${esc(book.title)}</h3><p class="detail-author">${esc(authorNames(book))}</p>${categoryChips(book)}${copy ? `<span class="status ${esc(copy.status)}">${esc(statusLabel(copy.status))}</span>` : ''}</div></div>
    ${book.description ? `<div class="book-description">${esc(book.description)}</div>` : ''}
    <div class="detail-grid">
      <div class="detail-item"><span>Penerbit</span><strong>${esc(book.publisher?.name || '—')}</strong></div><div class="detail-item"><span>Tahun</span><strong>${esc(book.publication_year || '—')}</strong></div>
      <div class="detail-item"><span>ISBN 13</span><strong>${esc(book.isbn_13 || '—')}</strong></div><div class="detail-item"><span>Bahasa</span><strong>${esc(book.language || '—')}</strong></div>
      <div class="detail-item"><span>No. Siri</span><strong>${esc(copy?.accession_no || copy?.legacy_serial_no || '—')}</strong></div><div class="detail-item"><span>Call No.</span><strong>${esc(copy?.legacy_call_no || '—')}</strong></div>
      <div class="detail-item"><span>Rak</span><strong>${esc(copy?.shelf?.code || copy?.shelf?.name || '—')}</strong></div><div class="detail-item"><span>Condition</span><strong>${esc(copy?.condition || '—')}</strong></div>
      <div class="detail-item"><span>Tarikh Beli</span><strong>${esc(copy?.acquisition_date ? prettyDate(copy.acquisition_date) : '—')}</strong></div><div class="detail-item"><span>Harga</span><strong>${esc(money(copy?.purchase_price))}</strong></div>
      <div class="detail-item"><span>Dibeli Dari</span><strong>${esc(copy?.purchased_from || '—')}</strong></div><div class="detail-item"><span>Pemilik</span><strong>${esc(copy?.owner_label || '—')}</strong></div>
    </div>
    ${copy?.notes ? `<div class="panel detail-note"><span class="tiny muted">NOTA</span><p>${esc(copy.notes)}</p></div>` : ''}
    ${copy ? `<div class="detail-actions"><button id="detail-edit" class="btn btn-secondary">Edit Rekod</button></div>` : ''}
    <section class="review-section"><div class="review-title"><div><p class="eyebrow">FAMILY READING</p><h3>Review & Bacaan Family</h3></div></div><div id="family-reviews"><div class="empty compact">Memuatkan…</div></div></section>
  </div>`;
  $('#book-dialog').showModal();
  $('#detail-edit')?.addEventListener('click', () => openEdit(book, copy));
  loadBookReviews(book.id);
}

async function loadBookReviews(bookId) {
  const container = $('#family-reviews');
  if (!container) return;
  const { data, error } = await supabase.from('book_reviews').select(`id,user_id,reading_status,rating,review_text,started_at,finished_at,updated_at,reviewer:profiles(display_name)`).eq('book_id', bookId).order('updated_at', { ascending: false });
  if (error) {
    if (isRound2Missing(error)) {
      state.round2Ready = false;
      container.innerHTML = '<div class="empty compact">Ruang review akan aktif selepas Round 2 database patch dijalankan.</div>';
      return;
    }
    console.error(error);
    container.innerHTML = '<div class="empty compact">Tak dapat load review sekarang.</div>';
    return;
  }
  const rows = data || [];
  const mine = rows.find(r => r.user_id === state.user.id);
  const otherHTML = rows.length ? rows.map(r => `<article class="review-card ${r.user_id === state.user.id ? 'my-review' : ''}">
    <div class="review-card-head"><strong>${esc(r.reviewer?.display_name || 'Family member')}</strong><span class="reading-badge ${esc(r.reading_status)}">${esc(readingStatusLabel(r.reading_status))}</span></div>
    ${r.rating ? `<div class="stars">${ratingStars(r.rating)}</div>` : ''}
    ${r.review_text ? `<p>${esc(r.review_text)}</p>` : '<p class="muted">Tiada ulasan ditulis.</p>'}
    <small>${r.finished_at ? `Selesai ${esc(prettyDate(r.finished_at))}` : r.started_at ? `Mula ${esc(prettyDate(r.started_at))}` : `Update ${esc(prettyDate(r.updated_at))}`}</small>
  </article>`).join('') : '<div class="empty compact">Belum ada sesiapa rekod bacaan untuk buku ini.</div>';

  container.innerHTML = `<div class="reviews-list">${otherHTML}</div>
    <form id="my-review-form" class="panel review-form">
      <div><p class="eyebrow">REKOD SAYA</p><h3>Status & Review Saya</h3></div>
      <div class="review-form-grid">
        <label><span>Status</span><select name="reading_status"><option value="WANT_TO_READ">Nak Baca</option><option value="READING">Sedang Baca</option><option value="READ">Selesai Baca</option><option value="DNF">Tak Dihabiskan</option></select></label>
        <label><span>Rating</span><select name="rating"><option value="">Tiada rating</option><option value="5">★★★★★ 5</option><option value="4">★★★★☆ 4</option><option value="3">★★★☆☆ 3</option><option value="2">★★☆☆☆ 2</option><option value="1">★☆☆☆☆ 1</option></select></label>
        <label><span>Mula Baca</span><input name="started_at" type="date"></label><label><span>Selesai Baca</span><input name="finished_at" type="date"></label>
        <label class="full"><span>Review</span><textarea name="review_text" rows="4" placeholder="Apa pendapat tentang buku ni?"></textarea></label>
      </div>
      <div class="action-row"><button class="btn btn-primary" type="submit">Simpan Bacaan</button>${mine ? '<button id="delete-my-review" class="btn btn-danger" type="button">Padam Rekod Saya</button>' : ''}</div>
    </form>`;
  const form = $('#my-review-form');
  form.elements.reading_status.value = mine?.reading_status || 'WANT_TO_READ';
  form.elements.rating.value = mine?.rating || '';
  form.elements.started_at.value = mine?.started_at || '';
  form.elements.finished_at.value = mine?.finished_at || '';
  form.elements.review_text.value = mine?.review_text || '';
  form.addEventListener('submit', e => saveMyReview(e, bookId));
  $('#delete-my-review')?.addEventListener('click', () => deleteMyReview(bookId));
}

async function saveMyReview(e, bookId) {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Menyimpan…';
  try {
    const payload = {
      book_id: bookId,
      user_id: state.user.id,
      reading_status: formValue(form, 'reading_status') || 'WANT_TO_READ',
      rating: formValue(form, 'rating') ? Number(formValue(form, 'rating')) : null,
      review_text: formValue(form, 'review_text') || null,
      started_at: formValue(form, 'started_at') || null,
      finished_at: formValue(form, 'finished_at') || null
    };
    const { error } = await supabase.from('book_reviews').upsert(payload, { onConflict: 'book_id,user_id' });
    if (error) throw error;
    toast('Rekod bacaan berjaya disimpan.');
    await Promise.all([loadBookReviews(bookId), loadReadingDashboard()]);
  } catch (err) {
    console.error(err);
    toast(err?.message || 'Tak dapat simpan rekod bacaan.', true);
  } finally {
    btn.disabled = false; btn.textContent = 'Simpan Bacaan';
  }
}

async function deleteMyReview(bookId) {
  if (!confirm('Padam rekod bacaan dan review anda untuk buku ini?')) return;
  const { error } = await supabase.from('book_reviews').delete().eq('book_id', bookId).eq('user_id', state.user.id);
  if (error) { console.error(error); toast('Tak dapat padam rekod bacaan.', true); return; }
  toast('Rekod bacaan dipadam.');
  await Promise.all([loadBookReviews(bookId), loadReadingDashboard()]);
}

function formValue(form, name) { return form.elements[name]?.value?.trim() || ''; }
function parseCategoryNames(value = '') {
  return [...new Set(value.split(/[,;]+/).map(x => x.trim()).filter(Boolean))];
}

async function findOrCreatePublisher(name) {
  if (!name) return null;
  let { data: found, error } = await supabase.from('publishers').select('id,name').ilike('name', name).is('archived_at', null).limit(1);
  if (error) throw error;
  if (found?.[0]) return found[0].id;
  const result = await supabase.from('publishers').insert({ name, source: 'WEBSITE', created_by: state.user.id, updated_by: state.user.id }).select('id').single();
  if (result.error) throw result.error;
  return result.data.id;
}

async function findOrCreateAuthor(name) {
  let { data: found, error } = await supabase.from('authors').select('id,name').ilike('name', name).is('archived_at', null).limit(1);
  if (error) throw error;
  if (found?.[0]) return found[0].id;
  const result = await supabase.from('authors').insert({ name, source: 'WEBSITE', created_by: state.user.id, updated_by: state.user.id }).select('id').single();
  if (result.error) throw result.error;
  return result.data.id;
}

async function findOrCreateShelf(code) {
  if (!code) return null;
  const { data: found, error } = await supabase.from('shelves').select('id,code').eq('code', code).is('archived_at', null).limit(1);
  if (error) throw error;
  if (found?.[0]) return found[0].id;
  const result = await supabase.from('shelves').insert({ code, name: code, created_by: state.user.id, updated_by: state.user.id }).select('id').single();
  if (result.error) throw result.error;
  return result.data.id;
}

async function getPrimaryCollection() {
  const { data, error } = await supabase.from('collections').select('id').eq('name', 'Koleksi Peribadi Zamri & Nor Azzah').is('archived_at', null).limit(1);
  if (error) throw error;
  return data?.[0]?.id || null;
}

function slugify(value = '') {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function findOrCreateCategory(name) {
  if (!name) return null;
  const existing = state.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const { data: found, error: findError } = await supabase.from('categories').select('id,name,slug').ilike('name', name).is('archived_at', null).limit(1);
  if (findError) throw findError;
  if (found?.[0]) return found[0].id;
  const { data, error } = await supabase.from('categories').insert({ name, slug: slugify(name) || `category-${Date.now()}`, source: 'FAMILY', created_by: state.user.id, updated_by: state.user.id }).select('id,name,slug').single();
  if (error) throw error;
  state.categories.push(data);
  state.categories.sort((a, b) => a.name.localeCompare(b.name));
  renderCategoryFilter();
  return data.id;
}

async function syncBookCategories(bookId, names) {
  if (!state.round2Ready && !names.length) return;
  try {
    const ids = [];
    for (const name of names) ids.push(await findOrCreateCategory(name));
    const del = await supabase.from('book_categories').delete().eq('book_id', bookId);
    if (del.error) throw del.error;
    if (ids.length) {
      const rows = ids.map(category_id => ({ book_id: bookId, category_id, created_by: state.user.id }));
      const ins = await supabase.from('book_categories').insert(rows);
      if (ins.error) throw ins.error;
    }
  } catch (error) {
    if (isRound2Missing(error)) { state.round2Ready = false; return; }
    throw error;
  }
}

async function addBook(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true; submit.textContent = 'Menyimpan…';
  try {
    const title = formValue(form, 'title');
    const authorList = formValue(form, 'authors').split(',').map(x => x.trim()).filter(Boolean);
    const isbn13 = formValue(form, 'isbn13').replace(/[^0-9Xx]/g, '');
    const year = formValue(form, 'year');
    const publisherName = formValue(form, 'publisher');
    const shelfCode = formValue(form, 'shelf');
    const categories = parseCategoryNames(formValue(form, 'categories'));
    let book = null;

    if (isbn13) {
      const { data, error } = await supabase.from('books').select('id').eq('isbn_13', isbn13).is('archived_at', null).limit(1);
      if (error) throw error;
      book = data?.[0] || null;
    }

    if (!book) {
      const publisher_id = await findOrCreatePublisher(publisherName);
      const metadata = state.lastLookupMeta?.isbn === isbn13 ? state.lastLookupMeta : {};
      const { data, error } = await supabase.from('books').insert({
        title,
        isbn_13: isbn13 || null,
        publication_year: year ? Number(year) : null,
        language: formValue(form, 'language') || null,
        description: formValue(form, 'description') || null,
        publisher_id,
        cover_url: formValue(form, 'cover_url') || null,
        source: 'WEBSITE',
        metadata,
        created_by: state.user.id,
        updated_by: state.user.id
      }).select('id').single();
      if (error) throw error;
      book = data;
      for (let i = 0; i < authorList.length; i++) {
        const author_id = await findOrCreateAuthor(authorList[i]);
        const link = await supabase.from('book_authors').insert({ book_id: book.id, author_id, author_order: i + 1, created_by: state.user.id, updated_by: state.user.id });
        if (link.error) throw link.error;
      }
    } else {
      toast('ISBN sudah wujud — naskhah baru ditambah pada judul sedia ada.');
    }

    const [collection_id, shelf_id] = await Promise.all([getPrimaryCollection(), findOrCreateShelf(shelfCode)]);
    const copy = await supabase.from('copies').insert({
      book_id: book.id,
      collection_id,
      shelf_id,
      accession_no: formValue(form, 'accession') || null,
      owner_label: formValue(form, 'owner_label') || null,
      acquisition_date: formValue(form, 'acquisition_date') || null,
      purchase_price: formValue(form, 'purchase_price') ? Number(formValue(form, 'purchase_price')) : null,
      purchased_from: formValue(form, 'purchased_from') || null,
      condition: formValue(form, 'condition') || null,
      notes: formValue(form, 'notes') || null,
      legacy_call_no: formValue(form, 'callno') || null,
      status: 'AVAILABLE',
      source: 'WEBSITE',
      created_by: state.user.id,
      updated_by: state.user.id
    });
    if (copy.error) throw copy.error;

    if (categories.length) {
      try { await syncBookCategories(book.id, categories); }
      catch (catError) { console.error(catError); toast('Buku disimpan, tetapi kategori gagal disimpan. Boleh tambah semula melalui Edit.', true); }
    }

    form.reset();
    $('#quick-isbn').value = '';
    $('#metadata-status').textContent = 'Metadata akan dicari melalui sumber buku awam. Kalau tak jumpa, isi manual seperti biasa.';
    state.lastLookupMeta = null;
    toast('Buku berjaya disimpan.');
    await Promise.all([loadCategories(), loadDashboard(), loadCatalogue(), loadActivity()]);
    navigate('catalogue');
  } catch (err) {
    console.error(err);
    toast(err?.message || 'Tak dapat simpan buku.', true);
  } finally {
    submit.disabled = false; submit.textContent = 'Simpan Buku';
  }
}

function openEdit(book, copy) {
  $('#book-dialog').close();
  const f = $('#edit-book-form');
  f.elements.book_id.value = book.id;
  f.elements.copy_id.value = copy.id;
  f.elements.title.value = book.title || '';
  f.elements.year.value = book.publication_year || '';
  f.elements.isbn13.value = book.isbn_13 || '';
  f.elements.publisher.value = book.publisher?.name || '';
  f.elements.categories.value = categoryNames(book).join(', ');
  f.elements.accession.value = copy.accession_no || '';
  f.elements.status.value = copy.status === 'ARCHIVED' ? 'AVAILABLE' : copy.status;
  f.elements.shelf.value = copy.shelf?.code || copy.shelf?.name || '';
  f.elements.condition.value = copy.condition || '';
  f.elements.acquisition_date.value = copy.acquisition_date || '';
  f.elements.purchase_price.value = copy.purchase_price ?? '';
  f.elements.purchased_from.value = copy.purchased_from || '';
  f.elements.owner_label.value = copy.owner_label || '';
  f.elements.callno.value = copy.legacy_call_no || '';
  f.elements.cover_url.value = book.cover_url || '';
  f.elements.description.value = book.description || '';
  f.elements.notes.value = copy.notes || '';
  $('#edit-dialog').showModal();
}

async function saveEdit(e) {
  e.preventDefault();
  const f = e.currentTarget;
  const submit = f.querySelector('button[type="submit"]');
  submit.disabled = true; submit.textContent = 'Menyimpan…';
  try {
    const book_id = f.elements.book_id.value;
    const copy_id = f.elements.copy_id.value;
    const publisher_id = await findOrCreatePublisher(formValue(f, 'publisher'));
    const shelf_id = await findOrCreateShelf(formValue(f, 'shelf'));
    const bookUpdate = await supabase.from('books').update({
      title: formValue(f, 'title'),
      publication_year: formValue(f, 'year') ? Number(formValue(f, 'year')) : null,
      isbn_13: formValue(f, 'isbn13').replace(/[^0-9Xx]/g, '') || null,
      publisher_id,
      cover_url: formValue(f, 'cover_url') || null,
      description: formValue(f, 'description') || null,
      updated_by: state.user.id
    }).eq('id', book_id);
    if (bookUpdate.error) throw bookUpdate.error;

    const copyUpdate = await supabase.from('copies').update({
      accession_no: formValue(f, 'accession') || null,
      status: formValue(f, 'status') || 'AVAILABLE',
      shelf_id,
      condition: formValue(f, 'condition') || null,
      acquisition_date: formValue(f, 'acquisition_date') || null,
      purchase_price: formValue(f, 'purchase_price') ? Number(formValue(f, 'purchase_price')) : null,
      purchased_from: formValue(f, 'purchased_from') || null,
      owner_label: formValue(f, 'owner_label') || null,
      legacy_call_no: formValue(f, 'callno') || null,
      notes: formValue(f, 'notes') || null,
      updated_by: state.user.id
    }).eq('id', copy_id);
    if (copyUpdate.error) throw copyUpdate.error;

    try { await syncBookCategories(book_id, parseCategoryNames(formValue(f, 'categories'))); }
    catch (catError) { console.error(catError); toast('Rekod utama disimpan, tetapi kategori gagal dikemaskini.', true); }

    $('#edit-dialog').close();
    toast('Rekod dikemaskini.');
    await Promise.all([loadCategories(), loadDashboard(), loadCatalogue(), loadActivity()]);
  } catch (err) {
    console.error(err);
    toast(err?.message || 'Tak dapat simpan perubahan.', true);
  } finally {
    submit.disabled = false; submit.textContent = 'Simpan Perubahan';
  }
}

async function archiveSelected() {
  const copy_id = $('#edit-book-form').elements.copy_id.value;
  if (!copy_id) return;
  if (!confirm('Archive naskhah ini? Ia akan dipindahkan ke Archive & Trash.')) return;
  try {
    const { error } = await supabase.rpc('archive_library_copy', { p_copy_id: copy_id });
    if (error) throw error;
    $('#edit-dialog').close();
    toast('Naskhah telah di-archive.');
    await Promise.all([loadDashboard(), loadCatalogue(), loadActivity()]);
  } catch (err) { console.error(err); toast(err?.message || 'Tak dapat archive naskhah.', true); }
}

async function loadArchive() {
  if (!state.user) return;
  const pageSize = 500;
  const all = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from('copies').select(`id,book_id,accession_no,status,archived_at,legacy_serial_no,book:books(id,title,cover_url,publication_year,book_authors(author:authors(name)))`).not('archived_at', 'is', null).order('archived_at', { ascending: false }).order('id', { ascending: true }).range(from, from + pageSize - 1);
    if (error) { console.error(error); toast('Tak dapat load archive.', true); return; }
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  state.archivedCopies = all;
  const list = $('#archive-list');
  if (!all.length) { list.innerHTML = '<div class="empty">Archive masih kosong.</div>'; return; }
  list.innerHTML = all.map(c => `<article class="archive-card">${coverHTML(c.book?.cover_url)}<div class="archive-main"><div class="book-title">${esc(c.book?.title || 'Rekod buku')}</div><div class="archive-meta">${esc(c.book ? authorNames(c.book) : '')} ${c.accession_no || c.legacy_serial_no ? `· ${esc(c.accession_no || c.legacy_serial_no)}` : ''}<br>Archived ${esc(prettyDate(c.archived_at, true))}</div></div><div class="archive-actions"><button class="btn btn-secondary" data-restore-copy="${c.id}">Restore</button><button class="btn btn-delete-permanent" data-delete-copy="${c.id}">Delete Permanently</button></div></article>`).join('');
  $$('[data-restore-copy]').forEach(b => b.onclick = () => restoreArchived(b.dataset.restoreCopy));
  $$('[data-delete-copy]').forEach(b => b.onclick = () => deleteArchived(b.dataset.deleteCopy));
}

async function restoreArchived(copyId) {
  try {
    const { error } = await supabase.rpc('restore_archived_copy', { p_copy_id: copyId });
    if (error) throw error;
    toast('Naskhah berjaya dipulihkan.');
    await Promise.all([loadArchive(), loadDashboard(), loadCatalogue(), loadActivity()]);
  } catch (err) { console.error(err); toast(err?.message || 'Tak dapat restore naskhah.', true); }
}

async function deleteArchived(copyId) {
  if (!confirm('Delete permanently? Data naskhah ini tidak boleh dipulihkan selepas dipadam.')) return;
  const typed = prompt('Untuk sahkan, taip DELETE');
  if (typed !== 'DELETE') { toast('Permanent delete dibatalkan.'); return; }
  try {
    const { error } = await supabase.rpc('purge_archived_copy', { p_copy_id: copyId });
    if (error) throw error;
    toast('Naskhah telah dipadam secara kekal.');
    await Promise.all([loadArchive(), loadDashboard(), loadCatalogue(), loadActivity()]);
  } catch (err) { console.error(err); toast(err?.message || 'Tak dapat delete naskhah.', true); }
}

async function loadActivity() {
  if (!state.user) return;
  const { data, error } = await supabase.from('audit_log').select('id,table_name,record_id,action,changed_by,changed_at').order('changed_at', { ascending: false }).limit(40);
  if (error) { console.error(error); return; }
  const ids = [...new Set((data || []).map(x => x.changed_by).filter(Boolean))];
  let profiles = {};
  if (ids.length) {
    const { data: p } = await supabase.from('profiles').select('id,display_name').in('id', ids);
    profiles = Object.fromEntries((p || []).map(x => [x.id, x.display_name]));
  }
  const mapTable = { books: 'buku', copies: 'naskhah', authors: 'penulis', publishers: 'penerbit', shelves: 'rak', collections: 'koleksi', book_authors: 'hubungan penulis', categories: 'kategori', book_categories: 'kategori buku', book_reviews: 'review/bacaan' };
  const mapAction = { INSERT: 'menambah', UPDATE: 'mengemaskini', DELETE: 'memadam' };
  $('#activity-list').innerHTML = (data || []).length ? data.map(x => {
    const who = profiles[x.changed_by] || 'Family member';
    return `<article class="activity-row"><div class="activity-dot">${x.action === 'INSERT' ? '+' : x.action === 'UPDATE' ? '↺' : '×'}</div><div><strong>${esc(who)} ${esc(mapAction[x.action] || x.action.toLowerCase())} ${esc(mapTable[x.table_name] || x.table_name)}</strong><p>${esc(prettyDate(x.changed_at, true))}</p></div></article>`;
  }).join('') : '<div class="empty">Belum ada aktiviti direkod.</div>';
}

async function saveProfile() {
  const name = $('#profile-name').value.trim();
  if (!name) { toast('Masukkan nama paparan.', true); return; }
  const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', state.user.id);
  if (error) { toast('Tak dapat simpan profile.', true); return; }
  await loadProfile();
  toast('Nama profile dikemaskini.');
}

function normalizeISBN(value = '') { return value.replace(/[^0-9Xx]/g, ''); }
function extractYear(value = '') { const m = String(value).match(/\b(18|19|20)\d{2}\b/); return m ? Number(m[0]) : null; }
function mapExternalCategories(values = []) {
  const text = values.join(' ').toLowerCase();
  const rules = [
    [/islam|religion|quran|koran|hadith|muslim|sufism|theology/, 'Agama & Islam'],
    [/juvenile|children|young adult|kids|child/, 'Kanak-kanak & Remaja'],
    [/fiction|novel|short stor|literature/, 'Fiksyen & Novel'],
    [/history|biograph|memoir/, 'Sejarah & Biografi'],
    [/law|legal|jurisprudence/, 'Undang-undang'],
    [/education|teaching|school|study/, 'Pendidikan'],
    [/business|finance|econom|management|career/, 'Perniagaan & Kewangan'],
    [/science|technology|computer|nature|medical|medicine|engineering|astronomy|biology|physics|chemistry/, 'Sains & Teknologi'],
    [/psychology|self-help|self help|motivation|personal development/, 'Psikologi & Pembangunan Diri'],
    [/politic|social science|society|government|public administration/, 'Politik & Masyarakat'],
    [/language|linguistic|literary criticism|poetry/, 'Bahasa & Sastera'],
    [/reference|encyclopedia|dictionary|handbook/, 'Rujukan & Umum']
  ];
  return [...new Set(rules.filter(([rx]) => rx.test(text)).map(([, name]) => name))];
}
function setFormIf(form, name, value, force = true) { if (value === undefined || value === null || value === '') return; const el = form.elements[name]; if (el && (force || !el.value)) el.value = value; }

async function lookupISBN(rawISBN) {
  const isbn = normalizeISBN(rawISBN || $('#quick-isbn').value || $('#add-isbn13').value);
  if (!(isbn.length === 10 || isbn.length === 13)) { toast('Masukkan ISBN 10 atau ISBN 13 yang sah.', true); return; }
  $('#quick-isbn').value = isbn;
  $('#add-isbn13').value = isbn;
  const status = $('#metadata-status');
  status.textContent = 'Mencari metadata buku…';
  $('#lookup-isbn-btn').disabled = true;
  try {
    let meta = null;
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`);
      if (res.ok) {
        const json = await res.json();
        const v = json?.items?.[0]?.volumeInfo;
        if (v?.title) {
          meta = {
            isbn,
            lookup_source: 'GOOGLE_BOOKS',
            title: v.title,
            authors: v.authors || [],
            publisher: v.publisher || '',
            year: extractYear(v.publishedDate),
            language: v.language || '',
            description: v.description || '',
            cover_url: (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace(/^http:/, 'https:'),
            categories: v.categories || []
          };
        }
      }
    } catch (e) { console.warn('Google Books lookup failed', e); }

    if (!meta) {
      try {
        const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`);
        if (res.ok) {
          const json = await res.json();
          const v = json?.[`ISBN:${isbn}`];
          if (v?.title) {
            meta = {
              isbn,
              lookup_source: 'OPEN_LIBRARY',
              title: v.title,
              authors: (v.authors || []).map(a => a.name).filter(Boolean),
              publisher: v.publishers?.[0]?.name || '',
              year: extractYear(v.publish_date),
              language: '',
              description: '',
              cover_url: (v.cover?.large || v.cover?.medium || v.cover?.small || '').replace(/^http:/, 'https:'),
              categories: (v.subjects || []).slice(0, 3).map(s => s.name).filter(Boolean)
            };
          }
        }
      } catch (e) { console.warn('Open Library lookup failed', e); }
    }

    if (!meta) {
      state.lastLookupMeta = null;
      status.textContent = 'ISBN dijumpai pada barcode, tetapi metadata awam tak tersedia. Isi maklumat manual.';
      toast('Metadata tak dijumpai. ISBN dah diisi untuk anda.', true);
      return;
    }

    state.lastLookupMeta = meta;
    const form = $('#add-book-form');
    setFormIf(form, 'title', meta.title);
    setFormIf(form, 'authors', meta.authors.join(', '));
    setFormIf(form, 'publisher', meta.publisher);
    setFormIf(form, 'year', meta.year);
    setFormIf(form, 'language', meta.language);
    setFormIf(form, 'description', meta.description);
    setFormIf(form, 'cover_url', meta.cover_url);
    setFormIf(form, 'isbn13', isbn);
    const suggestedCategories = mapExternalCategories(meta.categories);
    if (suggestedCategories.length && !form.elements.categories.value) form.elements.categories.value = suggestedCategories.join(', ');
    status.innerHTML = `Jumpa: <strong>${esc(meta.title)}</strong> · ${esc(meta.lookup_source === 'GOOGLE_BOOKS' ? 'Google Books' : 'Open Library')}${suggestedCategories.length ? ` · cadangan kategori: ${suggestedCategories.map(esc).join(', ')}` : ''}. Semak maklumat sebelum simpan.`;
    toast('Metadata buku berjaya diisi.');
  } catch (err) {
    console.error(err);
    status.textContent = 'Lookup gagal. Isi maklumat manual atau cuba lagi.';
    toast('Tak dapat tarik metadata sekarang.', true);
  } finally {
    $('#lookup-isbn-btn').disabled = false;
  }
}

async function startScanner() {
  if (!window.Html5Qrcode) { toast('Scanner belum berjaya dimuatkan. Cuba refresh page.', true); return; }
  await stopScanner();
  const reader = $('#isbn-reader');
  reader.classList.remove('hidden');
  $('#scan-isbn-btn').textContent = 'Tutup Scanner';
  try {
    state.scanner = new window.Html5Qrcode('isbn-reader');
    await state.scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 130 }, aspectRatio: 1.7778 },
      async decodedText => {
        const code = normalizeISBN(decodedText);
        if (code.length !== 13 && code.length !== 10) return;
        await stopScanner();
        $('#quick-isbn').value = code;
        $('#add-isbn13').value = code;
        await lookupISBN(code);
      },
      () => {}
    );
  } catch (err) {
    console.error(err);
    await stopScanner();
    toast('Camera tak dapat dibuka. Pastikan permission Camera dibenarkan, atau taip ISBN manual.', true);
  }
}

async function stopScanner() {
  if (state.scanner) {
    try { if (state.scanner.isScanning) await state.scanner.stop(); } catch (_) {}
    try { await state.scanner.clear(); } catch (_) {}
    state.scanner = null;
  }
  $('#isbn-reader')?.classList.add('hidden');
  if ($('#scan-isbn-btn')) $('#scan-isbn-btn').textContent = 'Scan Barcode';
}

let loginBusy = false;
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (loginBusy) return;
  const btn = e.currentTarget.querySelector('button[type="submit"]');
  loginBusy = true; btn.disabled = true; btn.textContent = 'Memeriksa…';
  try {
    const email = normalizeEmail($('#login-email').value);
    const password = $('#login-password').value;
    if (!email || !password) { toast('Masukkan email dan password.', true); return; }
    const { data, error } = await runAuthRequest(() => supabase.auth.signInWithPassword({ email, password }), { retries: 1 });
    if (error) { logAuthError('signInWithPassword', error); throw error; }
    if (!data?.user || !data?.session) throw new Error('Sesi login tidak berjaya dibentuk. Cuba semula.');
    await enterAppForUser(data.user);
  } catch (err) {
    logAuthError('login', err);
    toast(friendlyAuthError(err, 'login'), true);
  } finally {
    loginBusy = false; btn.disabled = false; btn.textContent = 'Log Masuk';
  }
});

$('#forgot-password-btn').addEventListener('click', showAuthForgot);
$('#back-login-btn').addEventListener('click', showAuthLogin);
$('#forgot-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.currentTarget.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Menghantar…';
  try {
    const email = normalizeEmail($('#forgot-email').value);
    const redirectTo = `${location.origin}${location.pathname}`;
    const { error } = await runAuthRequest(() => supabase.auth.resetPasswordForEmail(email, { redirectTo }), { retries: 0 });
    if (error) { logAuthError('resetPasswordForEmail', error); throw error; }
    toast('Link reset password telah dihantar. Semak email.');
    showAuthLogin();
  } catch (err) {
    logAuthError('forgot-password', err);
    toast(friendlyAuthError(err, 'email'), true);
  } finally { btn.disabled = false; btn.textContent = 'Hantar Link Reset'; }
});

$('#reset-password-form').addEventListener('submit', async e => {
  e.preventDefault();
  const p1 = $('#new-password').value;
  const p2 = $('#confirm-password').value;
  if (p1 !== p2) { toast('Password tidak sama.', true); return; }
  if (p1.length < 8) { toast('Password perlu sekurang-kurangnya 8 aksara.', true); return; }
  const btn = e.currentTarget.querySelector('button');
  btn.disabled = true; btn.textContent = 'Menyimpan…';
  try {
    const { error } = await runAuthRequest(() => supabase.auth.updateUser({ password: p1 }), { retries: 1 });
    if (error) { logAuthError('updateUser password', error); throw error; }
    history.replaceState(null, '', location.pathname);
    toast('Password baru berjaya disimpan.');
    await bootstrap();
  } catch (err) { logAuthError('reset-password', err); toast(friendlyAuthError(err, 'login'), true); }
  finally { btn.disabled = false; btn.textContent = 'Simpan Password Baru'; }
});

$('#logout-btn').addEventListener('click', async () => {
  await stopScanner();
  await supabase.auth.signOut({ scope: 'local' });
  state.user = null; state.profile = null; state.books = []; state.categories = []; state.archivedCopies = [];
  showAuthLogin();
  toast('Anda telah log keluar.');
});

$('#save-profile').addEventListener('click', saveProfile);
$('#add-book-form').addEventListener('submit', addBook);
$('#edit-book-form').addEventListener('submit', saveEdit);
$('#archive-copy').addEventListener('click', archiveSelected);
$('#close-dialog').addEventListener('click', () => $('#book-dialog').close());
$('#close-edit-dialog').addEventListener('click', () => $('#edit-dialog').close());
$('#catalogue-search').addEventListener('input', renderCatalogue);
$('#category-filter').addEventListener('change', e => { state.catalogueCategory = e.target.value; renderCatalogue(); });
$('#lookup-isbn-btn').addEventListener('click', () => lookupISBN());
$('#quick-isbn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); lookupISBN(); } });
$('#add-isbn13').addEventListener('input', e => { if (!$('#quick-isbn').value) $('#quick-isbn').value = e.target.value; });
$('#scan-isbn-btn').addEventListener('click', async () => { if (state.scanner) await stopScanner(); else await startScanner(); });

$$('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
  state.catalogueFilter = btn.dataset.filter;
  $$('[data-filter]').forEach(x => x.classList.toggle('active', x === btn));
  renderCatalogue();
}));
$$('[data-nav]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.nav)));
window.addEventListener('hashchange', () => {
  const hash = location.hash.replace('#', '');
  if (['home', 'catalogue', 'add', 'activity', 'profile', 'archive'].includes(hash) && !$('#app-shell').classList.contains('hidden')) navigate(hash, false);
});

$('#login-email')?.setAttribute('autocomplete', 'email');
$('#login-email')?.setAttribute('autocapitalize', 'none');
$('#login-email')?.setAttribute('spellcheck', 'false');
$('#login-password')?.setAttribute('autocomplete', 'current-password');
$('#forgot-email')?.setAttribute('autocomplete', 'email');
$('#new-password')?.setAttribute('autocomplete', 'new-password');
$('#confirm-password')?.setAttribute('autocomplete', 'new-password');

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && location.hash.includes('type=invite'))) { state.user = session?.user || null; showAuthReset(); return; }
  if (event === 'SIGNED_OUT') { state.user = null; showAuthLogin(); return; }
  if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session) state.user = session.user;
});

bootstrap();

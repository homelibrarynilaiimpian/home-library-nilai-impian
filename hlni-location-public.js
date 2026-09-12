import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://hpkzlioltmzyoalnqhgz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_57JvYsgIIi1LDnMYkew7XA_mOrQaZu2';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const MAP_URL = './map3d.html';
const locationCache = new Map();
const pending = new Set();
let flushTimer = null;
let lastBookId = null;

function esc(value='') {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function mapHref(loc) {
  if (loc?.location_complete && loc.rack_no && loc.bay_no) {
    return `${MAP_URL}?rack=${encodeURIComponent(loc.rack_no)}&bay=${encodeURIComponent(loc.bay_no)}`;
  }
  return MAP_URL;
}

function locationText(loc) {
  return loc?.location_complete
    ? `📍 ${loc.rack_name || `Rak ${loc.rack_no}`} • ${loc.bay_name || `Bay ${loc.bay_no}`}`
    : '—';
}

function buttonText(loc) {
  return loc?.location_complete ? '🧭 LIHAT LOKASI 3D' : '🗺️ LIHAT PETA 3D HLNI';
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

function decorateCard(card, loc) {
  if (!card || !card.isConnected) return;

  const main = card.querySelector('.public-book-card-main');
  if (main) {
    let line = main.querySelector('.hlni-card-location');
    if (!line) {
      line = document.createElement('div');
      line.className = 'hlni-card-location';
      main.appendChild(line);
    }
    line.textContent = locationText(loc);
  }

  let wrap = card.parentElement;
  if (!wrap?.classList.contains('hlni-location-card-wrap')) {
    wrap = document.createElement('div');
    wrap.className = 'hlni-location-card-wrap';
    card.parentNode.insertBefore(wrap, card);
    wrap.appendChild(card);
  }

  let link = wrap.querySelector('.hlni-card-map-btn');
  if (!link) {
    link = document.createElement('a');
    link.className = 'hlni-card-map-btn';
    wrap.appendChild(link);
  }
  link.href = mapHref(loc);
  link.textContent = buttonText(loc);
  link.setAttribute('aria-label',
    loc?.location_complete
      ? `Lihat lokasi ${loc.rack_name || `Rak ${loc.rack_no}`} ${loc.bay_name || `Bay ${loc.bay_no}`} dalam peta 3D`
      : 'Lihat peta 3D Home Library Nilai Impian'
  );
}

async function flushPending() {
  flushTimer = null;
  const ids = [...pending];
  pending.clear();
  if (!ids.length) return;

  const unknown = ids.filter(id => !locationCache.has(id));
  if (unknown.length) {
    try {
      const { data, error } = await supabase.rpc('public_book_locations_v1', {
        p_book_ids: unknown
      });
      if (error) throw error;

      const returned = new Map((data || []).map(row => [row.book_id, row]));
      unknown.forEach(id => locationCache.set(id, returned.get(id) || {
        book_id:id, rack_no:null, bay_no:null, rack_name:null, bay_name:null, location_complete:false
      }));
    } catch (error) {
      console.error('[HLNI Location]', error);
      unknown.forEach(id => locationCache.set(id, {
        book_id:id, rack_no:null, bay_no:null, rack_name:null, bay_name:null, location_complete:false
      }));
    }
  }

  ids.forEach(id => {
    document.querySelectorAll(`.public-book-card[data-public-book="${CSS.escape(id)}"]`).forEach(card => {
      decorateCard(card, locationCache.get(id));
    });
  });
}

function queueCards(root=document) {
  root.querySelectorAll?.('.public-book-card[data-public-book]').forEach(card => {
    const id = card.dataset.publicBook;
    if (!id) return;
    pending.add(id);
  });
  if (pending.size && !flushTimer) flushTimer = setTimeout(flushPending, 80);
}

function decorateDetail(bookId, loc) {
  const detail = document.querySelector('#public-book-detail');
  if (!detail || !bookId) return;
  const grid = detail.querySelector('.detail-grid');
  if (!grid) return;

  let block = detail.querySelector('.hlni-detail-location');
  if (!block) {
    block = document.createElement('section');
    block.className = 'hlni-detail-location';
    grid.insertAdjacentElement('afterend', block);
  }

  block.innerHTML = `
    <div>
      <span class="hlni-detail-location-label">LOKASI</span>
      <strong>${esc(locationText(loc))}</strong>
    </div>
    <a class="hlni-detail-map-btn" href="${esc(mapHref(loc))}">
      ${esc(buttonText(loc))}
    </a>
  `;
}

async function loadDetailLocation(bookId) {
  if (!bookId) return;
  let loc = locationCache.get(bookId);
  if (!loc) {
    const { data, error } = await supabase.rpc('public_book_location_v1', { p_book_id: bookId });
    if (error) {
      console.error('[HLNI Detail Location]', error);
      loc = { location_complete:false };
    } else {
      loc = data?.[0] || { location_complete:false };
    }
    locationCache.set(bookId, loc);
  }
  decorateDetail(bookId, loc);
}

document.addEventListener('click', event => {
  const card = event.target.closest?.('[data-public-book]');
  const reviewBook = event.target.closest?.('[data-public-review-book]');
  const id = card?.dataset.publicBook || reviewBook?.dataset.publicReviewBook;
  if (id) {
    lastBookId = id;
    setTimeout(() => loadDetailLocation(id), 100);
    setTimeout(() => loadDetailLocation(id), 450);
  }
}, true);

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches?.('.public-book-card[data-public-book]')) queueCards(node.parentElement || document);
      else if (node.querySelector?.('.public-book-card[data-public-book]')) queueCards(node);
    });
  }
  if (lastBookId && document.querySelector('#public-book-detail .detail-grid')) {
    loadDetailLocation(lastBookId);
  }
});

observer.observe(document.body, { childList:true, subtree:true });
ensureHeroMapButton();
queueCards(document);

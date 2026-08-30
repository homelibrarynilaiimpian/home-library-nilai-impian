import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://hpkzlioltmzyoalnqhgz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_57JvYsgIIi1LDnMYkew7XA_mOrQaZu2';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = {
  query: '', category: null, offset: 0, limit: 40, total: 0, books: new Map(), loading: false,
  publicView: 'catalogue', readingQuery: '', reviewRating: '', readingLoading: false
};

function esc(value=''){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function cover(url, cls='public-cover'){return url?`<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;${cls} cover-placeholder&quot;>HLNI</div>'">`:`<div class="${cls} cover-placeholder">HLNI</div>`}
function stars(r){if(!r)return '';const n=Math.round(Number(r));return '★'.repeat(n)+'☆'.repeat(Math.max(0,5-n))}
function friendlyCategory(name=''){const m=String(name).match(/^([A-Z]{1,3})\s*·\s*(.+)$/);return m?`${m[2]} (${m[1]})`:String(name)}
function chips(names=[]){return names?.length?`<div class="mini-categories">${names.slice(0,3).map(x=>`<span>${esc(friendlyCategory(x))}</span>`).join('')}</div>`:''}
function readingLabel(status=''){return status==='READ'?'Telah Dihabiskan':'Sedang Baca'}
function publicDate(value){if(!value)return '';try{return new Intl.DateTimeFormat('ms-MY',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value))}catch{return ''}}

function setupPending(error){
  const msg=(error?.message||'').toLowerCase();
  return /public_catalogue|public_family_reviews|function/.test(msg)&&(/not find|does not exist|schema cache/.test(msg));
}

async function loadStats(){
  const {data,error}=await supabase.rpc('public_catalogue_stats');
  if(error){console.error(error);return}
  const s=data?.[0]||data||{};
  $('#public-stat-titles').textContent=s.total_titles??0;
  $('#public-stat-available').textContent=s.available_titles??0;
  $('#public-stat-categories').textContent=s.total_categories??0;
  $('#public-stat-reads').textContent=s.family_reads??0;
}

async function loadCategories(){
  const {data,error}=await supabase.rpc('public_catalogue_categories');
  if(error){console.error(error);return}
  $('#public-category').innerHTML='<option value="">Semua kategori</option>'+((data||[]).map(c=>`<option value="${c.id}">${esc(friendlyCategory(c.name))}${Number(c.book_count)?` (${c.book_count})`:''}</option>`).join(''));
}

function card(b){
  return `<button class="public-book-card" data-public-book="${b.id}">${cover(b.cover_url)}<div><h3>${esc(b.title)}</h3><p>${esc(b.authors||'Penulis tidak direkod')}</p><div class="public-card-meta">${[b.publisher,b.publication_year,b.available?'Tersedia':'Tidak tersedia'].filter(Boolean).map(esc).join(' · ')}</div>${chips(b.categories)}${b.avg_rating?`<div class="public-card-rating"><span class="stars">${stars(b.avg_rating)}</span> ${esc(b.avg_rating)}${Number(b.review_count)?` · ${b.review_count} review`:''}</div>`:''}</div></button>`;
}

function bindCards(){$$('[data-public-book]').forEach(el=>el.onclick=()=>openDetail(el.dataset.publicBook))}

async function search({append=false}={}){
  if(state.loading)return;
  state.loading=true;
  const btn=$('#public-load-more');
  btn.disabled=true;
  if(!append){state.offset=0;state.books.clear();$('#public-grid').innerHTML='<div class="empty">Memuatkan katalog…</div>'}
  try{
    const {data,error}=await supabase.rpc('public_catalogue_search',{p_query:state.query||null,p_category:state.category||null,p_limit:state.limit,p_offset:state.offset});
    if(error)throw error;
    const rows=data||[];
    if(!append)$('#public-grid').innerHTML='';
    rows.forEach(b=>state.books.set(b.id,b));
    $('#public-grid').insertAdjacentHTML('beforeend',rows.map(card).join(''));
    bindCards();
    state.total=Number(rows?.[0]?.total_count||0);
    state.offset+=rows.length;
    $('#public-meta').textContent=`${state.total.toLocaleString('ms-MY')} judul${state.query?` · carian “${state.query}”`:''}`;
    btn.classList.toggle('hidden',state.offset>=state.total||rows.length===0);
    if(!state.total)$('#public-grid').innerHTML='<div class="empty">Tiada buku yang sepadan.</div>';
  }catch(error){
    console.error(error);
    if(setupPending(error)){
      $('#public-meta').textContent='Katalog awam sedang disediakan.';
      $('#public-grid').innerHTML='<div class="empty">Database patch terbaru belum selesai dijalankan.</div>';
    }else{
      $('#public-meta').textContent='Tak dapat load katalog sekarang.';
      $('#public-grid').innerHTML='<div class="empty">Sila cuba refresh sebentar lagi.</div>';
    }
  }finally{state.loading=false;btn.disabled=false}
}

async function loadPublicReviews(bookId){
  const wrap=$('#public-family-reviews');if(!wrap)return;
  const {data,error}=await supabase.rpc('public_book_reviews',{p_book_id:bookId});
  if(error){console.error(error);wrap.innerHTML='<div class="empty compact">Review family tak dapat dimuatkan sekarang.</div>';return}
  const rows=data||[];
  if(!rows.length){wrap.innerHTML='<div class="empty compact">Belum ada review family untuk buku ini.</div>';return}
  wrap.innerHTML=rows.map(r=>`<article class="public-review-card"><div class="public-review-head"><strong>${esc(r.reviewer_name||'Family member')}</strong><span class="reading-badge ${esc(r.reading_status)}">${esc(readingLabel(r.reading_status))}</span></div>${r.rating?`<div class="stars">${stars(r.rating)}</div>`:''}${r.review_text?`<p>${esc(r.review_text)}</p>`:'<p class="muted">Tiada ulasan bertulis.</p>'}<small>${esc(r.finished_at?`Selesai ${publicDate(r.finished_at)}`:r.started_at?`Mula ${publicDate(r.started_at)}`:`Dikemaskini ${publicDate(r.updated_at)}`)}</small></article>`).join('');
}

function openDetail(id){
  const b=state.books.get(id);if(!b)return;
  $('#public-book-detail').innerHTML=`<div class="detail-top">${cover(b.cover_url,'detail-cover')}<div><p class="eyebrow">PUBLIC CATALOGUE</p><h3 class="detail-title">${esc(b.title)}</h3><p class="detail-author">${esc(b.authors||'Penulis tidak direkod')}</p>${chips(b.categories)}${b.avg_rating?`<div class="public-card-rating"><span class="stars">${stars(b.avg_rating)}</span> ${esc(b.avg_rating)} · ${Number(b.review_count)||0} review family</div>`:''}</div></div><div class="detail-grid"><div class="detail-item"><span>Penerbit</span><strong>${esc(b.publisher||'—')}</strong></div><div class="detail-item"><span>Tahun</span><strong>${esc(b.publication_year||'—')}</strong></div><div class="detail-item"><span>Status</span><strong>${b.available?'Tersedia dalam koleksi':'Tidak tersedia sekarang'}</strong></div><div class="detail-item"><span>Kategori</span><strong>${esc((b.categories||[]).map(friendlyCategory).join(', ')||'Lain-lain')}</strong></div></div><section class="public-review-section"><div><p class="eyebrow">BACAAN KELUARGA</p><h3>Review Family</h3></div><div id="public-family-reviews"><div class="empty compact">Memuatkan review…</div></div></section><p class="public-note">Nama paparan, rating dan review family boleh dilihat visitor. Maklumat rak, harga, nota dalaman dan audit trail kekal private.</p>`;
  $('#public-book-dialog').showModal();
  loadPublicReviews(id);
}

function publicReadingCard(r){
  const date=r.finished_at?`Selesai ${publicDate(r.finished_at)}`:r.started_at?`Mula ${publicDate(r.started_at)}`:`Dikemaskini ${publicDate(r.updated_at)}`;
  return `<article class="public-reading-card">${cover(r.cover_url,'reading-cover')}<div class="public-reading-main"><div class="public-reading-book"><h3>${esc(r.title)}</h3><p>${esc(r.authors||'Penulis tidak direkod')}${r.publication_year?` · ${esc(r.publication_year)}`:''}</p></div><div class="public-review-head"><strong>${esc(r.reviewer_name||'Family member')}</strong><span class="reading-badge ${esc(r.reading_status)}">${esc(readingLabel(r.reading_status))}</span></div>${r.rating?`<div class="stars">${stars(r.rating)}</div>`:''}${r.review_text?`<p class="public-reading-review">${esc(r.review_text)}</p>`:'<p class="muted">Tiada ulasan bertulis.</p>'}<small>${esc(date)}</small></div></article>`;
}

async function loadPublicReading(){
  if(state.readingLoading)return;
  state.readingLoading=true;
  const list=$('#public-reading-list');
  const meta=$('#public-reading-meta');
  list.innerHTML='<div class="empty">Memuatkan review keluarga…</div>';
  try{
    const {data,error}=await supabase.rpc('public_family_reviews',{p_query:state.readingQuery||null,p_status:null,p_rating:state.reviewRating?Number(state.reviewRating):null,p_limit:100,p_offset:0});
    if(error)throw error;
    const rows=data||[];
    const total=Number(rows?.[0]?.total_count||0);
    meta.textContent=`${total.toLocaleString('ms-MY')} review keluarga${state.readingQuery?` · carian “${state.readingQuery}”`:''}`;
    list.innerHTML=rows.length?rows.map(publicReadingCard).join(''):'<div class="empty">Belum ada review keluarga yang sepadan.</div>';
  }catch(error){
    console.error(error);
    meta.textContent='Tak dapat load Review Keluarga sekarang.';
    list.innerHTML=setupPending(error)?'<div class="empty">Run SQL V6.2 dulu untuk aktifkan menu Review Keluarga awam.</div>':'<div class="empty">Sila cuba refresh sebentar lagi.</div>';
  }finally{state.readingLoading=false}
}

function setPublicView(view){
  state.publicView=view==='reading'?'reading':'catalogue';
  $('#public-view-catalogue').classList.toggle('hidden',state.publicView!=='catalogue');
  $('#public-view-reading').classList.toggle('hidden',state.publicView!=='reading');
  $$('[data-public-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.publicView===state.publicView));
  if(state.publicView==='reading')loadPublicReading();
}

let timer;
$('#public-search').addEventListener('input',e=>{state.query=e.target.value.trim();clearTimeout(timer);timer=setTimeout(()=>search(),280)});
$('#public-category').addEventListener('change',e=>{state.category=e.target.value||null;search()});
$('#public-load-more').addEventListener('click',()=>search({append:true}));
$('#public-close-dialog').addEventListener('click',()=>$('#public-book-dialog').close());
$$('[data-public-view]').forEach(btn=>btn.addEventListener('click',()=>setPublicView(btn.dataset.publicView)));
let readingTimer;
$('#public-reading-search').addEventListener('input',e=>{state.readingQuery=e.target.value.trim();clearTimeout(readingTimer);readingTimer=setTimeout(()=>loadPublicReading(),280)});
$$('[data-public-review-rating]').forEach(btn=>btn.addEventListener('click',()=>{
  state.reviewRating=btn.dataset.publicReviewRating||'';
  $$('[data-public-review-rating]').forEach(x=>x.classList.toggle('active',x===btn));
  loadPublicReading();
}));

await Promise.all([loadStats(),loadCategories()]);
await search();

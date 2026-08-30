import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://hpkzlioltmzyoalnqhgz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_57JvYsgIIi1LDnMYkew7XA_mOrQaZu2';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const $ = s => document.querySelector(s);
const state = { query: '', category: null, offset: 0, limit: 40, total: 0, books: new Map(), loading: false };

function esc(value=''){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function cover(url, cls='public-cover'){return url?`<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;${cls} cover-placeholder&quot;>HLNI</div>'">`:`<div class="${cls} cover-placeholder">HLNI</div>`}
function stars(r){if(!r)return '';const n=Math.round(Number(r));return '★'.repeat(n)+'☆'.repeat(Math.max(0,5-n))}
function chips(names=[]){return names?.length?`<div class="mini-categories">${names.slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}

function setupPending(error){
  const msg=(error?.message||'').toLowerCase();
  return /public_catalogue|function/.test(msg)&&(/not find|does not exist|schema cache/.test(msg));
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
  $('#public-category').innerHTML='<option value="">Semua kategori</option>'+((data||[]).map(c=>`<option value="${c.id}">${esc(c.name)}${Number(c.book_count)?` (${c.book_count})`:''}</option>`).join(''));
}

function card(b){
  return `<button class="public-book-card" data-public-book="${b.id}">${cover(b.cover_url)}<div><h3>${esc(b.title)}</h3><p>${esc(b.authors||'Penulis tidak direkod')}</p><div class="public-card-meta">${[b.publisher,b.publication_year,b.available?'Tersedia':'Tidak tersedia'].filter(Boolean).map(esc).join(' · ')}</div>${chips(b.categories)}${b.avg_rating?`<div class="public-card-rating"><span class="stars">${stars(b.avg_rating)}</span> ${esc(b.avg_rating)}${Number(b.review_count)?` · ${b.review_count} review`:''}</div>`:''}</div></button>`;
}

function bindCards(){document.querySelectorAll('[data-public-book]').forEach(el=>el.onclick=()=>openDetail(el.dataset.publicBook))}

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
      $('#public-grid').innerHTML='<div class="empty">Round 2 database patch belum dijalankan. Family site masih boleh digunakan seperti biasa.</div>';
    }else{
      $('#public-meta').textContent='Tak dapat load katalog sekarang.';
      $('#public-grid').innerHTML='<div class="empty">Sila cuba refresh sebentar lagi.</div>';
    }
  }finally{state.loading=false;btn.disabled=false}
}

function openDetail(id){
  const b=state.books.get(id);if(!b)return;
  $('#public-book-detail').innerHTML=`<div class="detail-top">${cover(b.cover_url,'detail-cover')}<div><p class="eyebrow">PUBLIC CATALOGUE</p><h3 class="detail-title">${esc(b.title)}</h3><p class="detail-author">${esc(b.authors||'Penulis tidak direkod')}</p>${chips(b.categories)}${b.avg_rating?`<div class="public-card-rating"><span class="stars">${stars(b.avg_rating)}</span> ${esc(b.avg_rating)} · ${Number(b.review_count)||0} review family</div>`:''}</div></div><div class="detail-grid"><div class="detail-item"><span>Penerbit</span><strong>${esc(b.publisher||'—')}</strong></div><div class="detail-item"><span>Tahun</span><strong>${esc(b.publication_year||'—')}</strong></div><div class="detail-item"><span>Status</span><strong>${b.available?'Tersedia dalam koleksi':'Tidak tersedia sekarang'}</strong></div><div class="detail-item"><span>Kategori</span><strong>${esc((b.categories||[]).join(', ')||'Belum dikategori')}</strong></div></div><p class="public-note">Maklumat rak, pemilik, harga, nota dalaman dan identiti reviewer tidak dipaparkan kepada visitor.</p>`;
  $('#public-book-dialog').showModal();
}

let timer;
$('#public-search').addEventListener('input',e=>{state.query=e.target.value.trim();clearTimeout(timer);timer=setTimeout(()=>search(),280)});
$('#public-category').addEventListener('change',e=>{state.category=e.target.value||null;search()});
$('#public-load-more').addEventListener('click',()=>search({append:true}));
$('#public-close-dialog').addEventListener('click',()=>$('#public-book-dialog').close());

await Promise.all([loadStats(),loadCategories()]);
await search();

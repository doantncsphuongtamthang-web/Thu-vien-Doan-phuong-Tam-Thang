const SUPABASE_URL="https://cwupmehkajtwydwmgntj.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zY3djYnJnY2treWZ4cGdwc3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTc5NDEsImV4cCI6MjEwNTYzMzk0MX0.zibHWfICPmCXurCvt1yRKbQMGFjeXxl6kWD_suPZF0o";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])), date=d=>d?new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(d)):"";
let news=[],docs=[],albums=[],videos=[],cats=[];
function detail(type,id){
  try{
    const source=type==='document'?docs:type==='news'?news:type==='album'?albums:type==='video'?videos:[];
    const row=source.find(x=>String(x.id)===String(id));
    if(row) sessionStorage.setItem(`kp25_detail_${type}_${id}`,JSON.stringify(row));
  }catch(e){}
  location.href=`detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
}
async function load(){
 const [n,d,a,v,c]=await Promise.all([
  sb.from("news").select("*").eq("is_published",true).order("published_at",{ascending:false}).limit(12),
  sb.from("documents").select("*").eq("is_published",true).order("created_at",{ascending:false}).limit(100),
  sb.from("albums").select("*").eq("is_published",true).order("created_at",{ascending:false}).limit(12),
  sb.from("media").select("*").eq("is_published",true).eq("media_type","video").order("created_at",{ascending:false}).limit(12),
  sb.from("categories").select("*").order("sort_order")
 ]);
 news=n.data||[];docs=d.data||[];albums=a.data||[];videos=v.data||[];cats=c.data||[];
 renderStats();renderNews();renderDocs();renderAlbums();renderVideos();renderFilters();
}
function renderStats(){$("stats").innerHTML=`<div><b>📰</b><strong>${news.length}</strong><span>Tin hoạt động</span></div><div><b>📚</b><strong>${docs.length}</strong><span>Tài liệu</span></div><div><b>📸</b><strong>${albums.length}</strong><span>Album hình ảnh</span></div><div><b>🎬</b><strong>${videos.length}</strong><span>Video</span></div>`}
function renderNews(list=news){$("newsGrid").innerHTML=list.length?list.map(x=>`<article class="news-card" onclick="detail('news','${x.id}')">${x.cover_url?`<img src="${esc(x.cover_url)}">`:`<div class="placeholder">📰</div>`}<div class="card-body"><small>${date(x.published_at)}</small><h3>${esc(x.title)}</h3><p>${esc(x.summary||"Xem nội dung và hình ảnh hoạt động.")}</p><span class="card-link">Xem chi tiết →</span></div></article>`).join(""):`<div class="notice">Chưa có tin hoạt động.</div>`}
function renderDocs(list=docs){$("docsGrid").innerHTML=list.length?list.map(x=>`<article class="doc-card" onclick="detail('document','${x.id}')"><div class="file-icon">${esc(x.file_type||"FILE")}</div><div><small>${esc(x.category||"Tài liệu")} · ${date(x.created_at)}</small><h3>${esc(x.title)}</h3><p>${esc(x.description||"Xem và tải tài liệu.")}</p><div class="doc-meta">👁 ${x.view_count||0} · ⬇ ${x.download_count||0} lượt tải</div></div></article>`).join(""):`<div class="notice">Không tìm thấy tài liệu.</div>`}
function renderAlbums(){if(!albums.length){$("albumsGrid").innerHTML='<div class="notice">Chưa có album hình ảnh.</div>';return}$("albumsGrid").innerHTML=albums.map(x=>`<article class="album-card" onclick="detail('album','${x.id}')">${x.cover_url?`<img src="${esc(x.cover_url)}">`:`<div class="placeholder">📸</div>`}<div class="card-body"><small>${date(x.created_at)}</small><h3>${esc(x.title)}</h3><p>${esc(x.description||"Bấm để xem toàn bộ ảnh.")}</p><span class="card-link">Xem album →</span></div></article>`).join("")}
function renderVideos(){if(!videos.length){$("videosGrid").innerHTML='<div class="notice">Chưa có video.</div>';return}$("videosGrid").innerHTML=videos.map(x=>`<article class="video-card" onclick="detail('video','${x.id}')"><div class="video-thumb">▶</div><div><small>${date(x.created_at)}</small><h3>${esc(x.title)}</h3><span class="card-link">Xem video →</span></div></article>`).join("")}
function renderFilters(){let ys=[...new Set(docs.map(x=>new Date(x.created_at).getFullYear()))].sort((a,b)=>b-a);$("docYear").innerHTML='<option value="">Tất cả năm</option>'+ys.map(y=>`<option>${y}</option>`).join("");$("docCat").innerHTML='<option value="">Tất cả danh mục</option>'+cats.map(c=>`<option>${esc(c.name)}</option>`).join("")}
function filterDocs(){let q=$("docSearch").value.toLowerCase(),y=$("docYear").value,c=$("docCat").value;renderDocs(docs.filter(x=>(!q||[x.title,x.description,x.file_name,x.category].join(" ").toLowerCase().includes(q))&&(!y||new Date(x.created_at).getFullYear()==y)&&(!c||x.category===c)))}
$("docSearch").oninput=filterDocs;$("docYear").onchange=filterDocs;$("docCat").onchange=filterDocs;
$("globalSearch").onkeydown=e=>{if(e.key==="Enter"){let q=e.target.value.trim();$("docSearch").value=q;location.hash="#documents";filterDocs();renderNews(news.filter(x=>[x.title,x.summary,x.content].join(" ").toLowerCase().includes(q.toLowerCase())))}};$("menuBtn").onclick=()=>$("mainNav").classList.toggle("open");
load();

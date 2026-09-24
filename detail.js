/* DOAN_TAM_THANG public detail page - intentionally uses native fetch instead of supabase-js.
   This makes public viewing independent from the Supabase JS CDN. */
(() => {
  const SUPABASE_URL = "https://cwupmehkajtwydwmgntj.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zY3djYnJnY2treWZ4cGdwc3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTc5NDEsImV4cCI6MjEwNTYzMzk0MX0.zibHWfICPmCXurCvt1yRKbQMGFjeXxl6kWD_suPZF0o";
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const date = d => d ? new Intl.DateTimeFormat("vi-VN", {day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(d)) : "";
  const params = new URLSearchParams(location.search);
  const type = params.get("type");
  const id = params.get("id");
  let gallery = [], gi = 0;

  function storageUrl(bucket, path, fallback="") {
    if (fallback) return fallback;
    if (!path) return "";
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${String(path).split('/').map(encodeURIComponent).join('/')}`;
  }
  function safeName(s) { return (s || "file").replace(/[^\w\-À-ỹ .]/g, "_"); }
  function showError(title, err) {
    console.error(title, err);
    const msg = err?.message || String(err || "Không rõ lỗi");
    $("detail").innerHTML = `<div class="notice"><strong>${esc(title)}</strong><br><small>Chi tiết: ${esc(msg)}</small><br><br><button class="outline-btn" type="button" onclick="location.reload()">↻ Thử lại</button></div>`;
  }
  function cached() {
    try {
      const x = sessionStorage.getItem(`kp25_detail_${type}_${id}`);
      return x ? JSON.parse(x) : null;
    } catch { return null; }
  }
  async function rest(table, select="*", filters="") {
    const u = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filters ? `&${filters}` : ""}`;
    const r = await fetch(u, {headers});
    const text = await r.text();
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0,500)}`);
    try { return JSON.parse(text); } catch { return []; }
  }
  async function rpc(name, body) {
    try { await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {method:"POST", headers:{...headers,"Content-Type":"application/json"}, body:JSON.stringify(body)}); } catch {}
  }
  async function getRow(table) {
    const c = cached();
    if (c && String(c.id) === String(id)) return c;
    const rows = await rest(table, "*", `id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] || null;
  }
  async function downloadFile(url, name, bucket, path) {
    try {
      let blob = null;
      if (path) {
        const r = await fetch(storageUrl(bucket, path), {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`} });
        if (r.ok) blob = await r.blob();
      }
      if (!blob) {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        blob = await r.blob();
      }
      const u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = safeName(name || "download"); a.style.display = "none";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000);
    } catch (e) {
      console.warn("download fallback", e);
      window.open(url, "_blank", "noopener");
    }
  }
  window.copyLink = async () => { try { await navigator.clipboard.writeText(location.href); alert("Đã sao chép liên kết."); } catch { prompt("Sao chép liên kết này:", location.href); } };
  window.openPhoto = i => { gi=i; showPhoto(); };
  window.downloadPhoto = async (i,e) => { e?.stopPropagation(); const im=gallery[i]; if(im) await downloadFile(im.display_url, `anh-${i+1}.jpg`, "media", im.image_path); };
  function showPhoto(){ const im=gallery[gi]; if(!im)return; $("lbImg").src=im.display_url; $("lbCaption").textContent=im.caption||""; $("lbDownload").onclick=e=>{e.preventDefault();window.downloadPhoto(gi,e)}; $("lightbox").classList.remove("hidden"); }
  function bindLightbox(){
    $("lbClose").onclick=()=>$("lightbox").classList.add("hidden");
    $("lbPrev").onclick=()=>{if(!gallery.length)return;gi=(gi-1+gallery.length)%gallery.length;showPhoto();};
    $("lbNext").onclick=()=>{if(!gallery.length)return;gi=(gi+1)%gallery.length;showPhoto();};
    $("lightbox").onclick=e=>{if(e.target.id==="lightbox")$("lightbox").classList.add("hidden");};
  }
  async function loadDoc(){
    const x=await getRow("documents");
    if(!x) throw new Error("Không tìm thấy tài liệu này, hoặc tài liệu chưa được công khai.");
    rpc("increment_document_view", {doc_id:id});
    const url=storageUrl("documents", x.storage_path, x.public_url);
    if(!url) throw new Error("Bản ghi tài liệu chưa có đường dẫn file (storage_path/public_url).");
    const isPdf=String(x.file_type||"").toUpperCase()==="PDF" || /\.pdf(?:$|\?)/i.test(url) || /\.pdf$/i.test(x.file_name||"");
    $("detail").innerHTML=`<div class="detail-kicker">📚 TÀI LIỆU</div><h1>${esc(x.title)}</h1><div class="detail-meta">${esc(x.category||"Tài liệu")} · ${date(x.created_at)} · 👁 ${x.view_count||0} lượt xem</div>${x.description?`<p class="lead">${esc(x.description)}</p>`:""}<div class="doc-actions"><a class="green-btn" href="${esc(url)}" target="_blank" rel="noopener">📄 ${isPdf?"Mở tài liệu":"Mở file"}</a><button class="outline-btn" id="downloadDocBtn" type="button">⬇️ Tải tài liệu</button><button class="outline-btn" type="button" onclick="copyLink()">🔗 Chia sẻ</button></div>${isPdf?`<div class="file-viewer"><iframe src="${esc(url)}" title="Xem tài liệu PDF"></iframe></div>`:`<div class="notice">File ${esc(x.file_type||"")}. Bạn có thể mở hoặc tải file bằng các nút phía trên.</div>`}`;
    $("downloadDocBtn").onclick=async()=>{await downloadFile(url,x.file_name||x.title,"documents",x.storage_path);rpc("increment_document_download",{doc_id:id});};
  }
  async function loadAlbum(){
    const a=await getRow("albums"); if(!a) throw new Error("Không tìm thấy album hoặc album chưa được công khai.");
    const rows=await rest("album_images","*",`album_id=eq.${encodeURIComponent(id)}&order=sort_order.asc,created_at.asc`);
    gallery=rows.map(im=>({...im,display_url:storageUrl("media",im.image_path,im.image_url)}));
    $("detail").innerHTML=`<div class="detail-kicker">📸 THƯ VIỆN HÌNH ẢNH</div><h1>${esc(a.title)}</h1><div class="detail-meta">${date(a.created_at)} · ${gallery.length} ảnh</div>${a.description?`<p class="lead">${esc(a.description)}</p>`:""}<div class="doc-actions"><button class="green-btn" id="downloadAlbum" type="button">⬇️ Tải toàn bộ album</button><button class="outline-btn" type="button" onclick="copyLink()">🔗 Chia sẻ album</button></div><div class="photo-grid">${gallery.map((im,i)=>`<figure><button class="photo-open" type="button" onclick="openPhoto(${i})"><img src="${esc(im.display_url)}" loading="lazy" alt="${esc(im.caption||a.title)}"></button><figcaption>${esc(im.caption||"")} <button class="photo-download" type="button" onclick="downloadPhoto(${i},event)">⬇️ Tải ảnh</button></figcaption></figure>`).join("") || '<div class="notice">Album chưa có ảnh.</div>'}</div>`;
    $("downloadAlbum").onclick=()=>downloadAlbum(a.title);
  }
  async function ensureJSZip(){ if(window.JSZip)return window.JSZip; return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";s.onload=()=>resolve(window.JSZip);s.onerror=()=>reject(new Error("Không tải được thư viện tạo ZIP."));document.head.appendChild(s);}); }
  async function downloadAlbum(title){
    if(!gallery.length)return; const btn=$("downloadAlbum"); btn.disabled=true; btn.textContent="⏳ Đang tạo ZIP…";
    try{const Zip=await ensureJSZip(),zip=new Zip();let added=0;for(let i=0;i<gallery.length;i++){const im=gallery[i];try{const r=await fetch(im.display_url);if(r.ok){zip.file(`${String(i+1).padStart(3,"0")}-${safeName(im.caption||"anh")}.jpg`,await r.blob());added++;}}catch{}}if(!added)throw new Error("Không tải được ảnh từ Storage.");const blob=await zip.generateAsync({type:"blob"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=`${safeName(title)}.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);}catch(e){alert(e.message+" Bạn có thể tải từng ảnh bằng nút ⬇️ Tải ảnh.");}finally{btn.disabled=false;btn.textContent="⬇️ Tải toàn bộ album";}
  }
  async function loadNews(){
    const x=await getRow("news"); if(!x) throw new Error("Không tìm thấy tin hoạt động hoặc tin chưa được công khai.");
    const rows=await rest("news_images","*",`news_id=eq.${encodeURIComponent(id)}&order=sort_order.asc,created_at.asc`);
    gallery=rows.map(im=>({...im,display_url:storageUrl("media",im.image_path,im.image_url)}));
    const cover=storageUrl("media",x.cover_path,x.cover_url);
    $("detail").innerHTML=`<div class="detail-kicker">📰 TIN HOẠT ĐỘNG</div>${cover?`<img class="detail-cover" src="${esc(cover)}" alt="">`:""}<h1>${esc(x.title)}</h1><div class="detail-meta">${date(x.published_at)}</div>${x.summary?`<p class="lead">${esc(x.summary)}</p>`:""}<div class="article-content">${esc(x.content||"").replace(/\n/g,"<br>")}</div>${gallery.length?`<h2>📸 Hình ảnh hoạt động</h2><div class="photo-grid">${gallery.map((im,i)=>`<figure><button class="photo-open" type="button" onclick="openPhoto(${i})"><img src="${esc(im.display_url)}" loading="lazy"></button><figcaption>${esc(im.caption||"")} <button class="photo-download" type="button" onclick="downloadPhoto(${i},event)">⬇️ Tải ảnh</button></figcaption></figure>`).join("")}</div>`:""}`;
  }
  async function loadVideo(){
    const x=await getRow("media"); if(!x) throw new Error("Không tìm thấy video hoặc video chưa được công khai."); const url=storageUrl("media",x.storage_path,x.public_url); if(!url)throw new Error("Video chưa có đường dẫn file.");
    $("detail").innerHTML=`<div class="detail-kicker">🎬 VIDEO</div><h1>${esc(x.title)}</h1><div class="detail-meta">${date(x.created_at)}</div><video class="video-player" controls playsinline preload="metadata" src="${esc(url)}"></video><div class="doc-actions"><button class="outline-btn" id="downloadVideo" type="button">⬇️ Tải video</button></div>`;
    $("downloadVideo").onclick=()=>downloadFile(url,(x.title||"video")+".mp4","media",x.storage_path);
  }
  async function load(){
    bindLightbox();
    if(!type||!id){showError("Không tìm thấy nội dung",new Error("URL thiếu type hoặc id."));return;}
    try{ if(type==="document")await loadDoc(); else if(type==="album")await loadAlbum(); else if(type==="news")await loadNews(); else if(type==="video")await loadVideo(); else throw new Error("Loại nội dung không hợp lệ: "+type); }
    catch(e){showError("Không thể mở nội dung",e);}
  }
  window.addEventListener("error", e => { if($("detail") && $("detail").textContent.includes("Đang tải nội dung")) showError("Trang chi tiết gặp lỗi JavaScript", e.error || new Error(e.message)); });
  load();
})();

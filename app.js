const STORAGE="whisky_collection_v2", HISTORY="whisky_sales_history_v1", SAVED="whisky_saved_searches_v1", AUTO="whisky_auto_backup_v4";
let bottles=loadJSON(STORAGE,[]), history=loadJSON(HISTORY,[]), saved=loadJSON(SAVED,[]);
let currentPhoto="", photoTarget=null;
const PHOTO_DB="WhiskyCollectionPhotosV1";
let photoDBPromise=null;

function loadJSON(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch(e){return f}}
function openPhotoDB(){
  if(photoDBPromise)return photoDBPromise;
  photoDBPromise=new Promise((resolve,reject)=>{
    const r=indexedDB.open(PHOTO_DB,1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("photos"))r.result.createObjectStore("photos")};
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
  return photoDBPromise;
}
async function putPhoto(id,data){
  const db=await openPhotoDB();
  return new Promise((resolve,reject)=>{const tx=db.transaction("photos","readwrite");tx.objectStore("photos").put(data,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
}
async function getPhoto(id){
  if(!id)return "";
  try{const db=await openPhotoDB();return await new Promise((resolve,reject)=>{const tx=db.transaction("photos","readonly");const q=tx.objectStore("photos").get(id);q.onsuccess=()=>resolve(q.result||"");q.onerror=()=>reject(q.error)})}catch(e){return ""}
}
async function deletePhoto(id){
  if(!id)return;
  try{const db=await openPhotoDB();await new Promise((resolve,reject)=>{const tx=db.transaction("photos","readwrite");tx.objectStore("photos").delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}catch(e){}
}
function lightBottles(){
  return bottles.map(b=>{const x={...b};delete x.photo;return x});
}
async function save(){
  try{
    localStorage.setItem(STORAGE,JSON.stringify(lightBottles()));
    localStorage.setItem(HISTORY,JSON.stringify(history));
    localStorage.setItem(SAVED,JSON.stringify(saved));
    try{localStorage.setItem(AUTO,JSON.stringify({date:new Date().toISOString(),bottles:lightBottles(),history,saved}))}catch(e){}
    return true;
  }catch(e){
    alert("La sauvegarde a échoué. Votre collection n’a pas été supprimée. Vérifiez l’espace de stockage de Safari.");
    return false;
  }
}
async function hydratePhotos(){
  for(const b of bottles){
    if(!b.photo && b.photoId)b.photo=await getPhoto(b.photoId);
  }
  render();
}
async function migratePhotos(){
  let changed=false;
  for(const b of bottles){
    if(b.photo){
      const pid=b.photoId||("p_"+b.id);
      try{await putPhoto(pid,b.photo);b.photoId=pid;delete b.photo;changed=true}catch(e){}
    }
  }
  if(changed){
    localStorage.setItem(STORAGE,JSON.stringify(lightBottles()));
    await hydratePhotos();
  }
}
function euro(n){return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(Number(n||0))}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function showView(v){document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));document.getElementById(v).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===v));render()}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showView(b.dataset.view));
document.getElementById("seeCollection").onclick=()=>showView("collectionView");
["addTop","addHero","addCollection"].forEach(x=>document.getElementById(x).onclick=()=>openBottle());

function card(b){
 return `<article class="card"><div class="thumb ${b.photo?"":"empty"}">${b.photo?`<img class="thumb" src="${b.photo}" alt="">`:"🥃"}</div><div class="card-main">
 <h3>${esc(b.name)}</h3><div class="meta">${esc(b.distillery||"")} ${b.country?"• "+esc(b.country):""}</div>
 <div class="badges">${b.age?`<span class="badge">${b.age} ans</span>`:""}${b.score?`<span class="badge score">★ ${b.score}/100</span>`:""}<span class="badge">${b.qty||0} en stock</span></div>
 <div class="card-actions"><button class="secondary" onclick="openBottle('${b.id}')">Modifier</button><button class="secondary" onclick="openExit('${b.id}')">Sortir</button></div>
 </div></article>`
}
function filtered(){
 const q=document.getElementById("searchInput").value.toLowerCase(), d=document.getElementById("filterDistillery").value.toLowerCase(), c=document.getElementById("filterCountry").value.toLowerCase(), min=Number(document.getElementById("filterMinScore").value||0), max=Number(document.getElementById("filterMaxPrice").value||Infinity), stock=document.getElementById("stockOnly").checked;
 return bottles.filter(b=>(!q||[b.name,b.distillery,b.country,b.notes,b.nose,b.palate,b.finish].join(" ").toLowerCase().includes(q))&&(!d||String(b.distillery).toLowerCase().includes(d))&&(!c||String(b.country).toLowerCase().includes(c))&&(!min||Number(b.score||0)>=min)&&Number(b.price||0)<=max&&(!stock||Number(b.qty||0)>0))
}
function render(){
 const inStock=bottles.filter(b=>Number(b.qty)>0), value=inStock.reduce((s,b)=>s+Number(b.price||0)*Number(b.qty||0),0), rated=inStock.filter(b=>b.score);
 document.getElementById("statBottles").textContent=inStock.reduce((s,b)=>s+Number(b.qty||0),0);
 document.getElementById("statValue").textContent=euro(value);
 document.getElementById("statAvg").textContent=rated.length?(rated.reduce((s,b)=>s+Number(b.score),0)/rated.length).toFixed(1)+"/100":"—";
 document.getElementById("recentList").innerHTML=bottles.slice().reverse().slice(0,3).map(card).join("")||`<p class="muted">Aucune bouteille pour le moment.</p>`;
 document.getElementById("collectionList").innerHTML=filtered().map(card).join("")||`<p class="muted">Aucune bouteille ne correspond à votre recherche.</p>`;
 document.getElementById("savedSearches").innerHTML=saved.map((s,i)=>`<button class="chip" onclick="applySaved(${i})">${esc(s.name)}</button>`).join("");
 document.getElementById("historyList").innerHTML=history.slice().reverse().map(h=>`<article class="card"><div class="card-main"><h3>${esc(h.name)}</h3><div class="meta">${h.qty} bouteille(s) • ${esc(h.reason)} • ${new Date(h.date).toLocaleDateString("fr-FR")}</div>${h.salePrice?`<div class="meta">Prix de vente : ${euro(h.salePrice)}</div>`:""}</div></article>`).join("")||`<p class="muted">Aucune sortie enregistrée.</p>`;
 document.getElementById("statsFull").innerHTML=`<div class="stat-line"><span>Bouteilles en stock</span><strong>${inStock.reduce((s,b)=>s+Number(b.qty||0),0)}</strong></div><div class="stat-line"><span>Valeur de la collection</span><strong>${euro(value)}</strong></div><div class="stat-line"><span>Note moyenne</span><strong>${rated.length?(rated.reduce((s,b)=>s+Number(b.score),0)/rated.length).toFixed(1)+"/100":"—"}</strong></div><div class="stat-line"><span>Références</span><strong>${bottles.length}</strong></div><div class="stat-line"><span>Sorties enregistrées</span><strong>${history.length}</strong></div>`;
}
["searchInput","filterDistillery","filterCountry","filterMinScore","filterMaxPrice","stockOnly"].forEach(x=>document.getElementById(x).addEventListener("input",render));

function resetForm(){
 document.getElementById("bottleForm").reset();document.getElementById("editId").value="";currentPhoto="";updatePhotoPreview();document.getElementById("modalTitle").textContent="Ajouter une bouteille";
}
async function openBottle(editId=null){
 resetForm();
 if(editId){const b=bottles.find(x=>x.id===editId);if(!b)return;document.getElementById("modalTitle").textContent="Modifier la bouteille";document.getElementById("editId").value=b.id;["name","distillery","country","age","abv","volume","qty","price","score","nose","palate","finish","notes"].forEach(k=>document.getElementById(k).value=b[k]??"");currentPhoto=b.photo||await getPhoto(b.photoId);updatePhotoPreview()}
 document.getElementById("modal").classList.remove("hidden");
}
document.getElementById("closeModal").onclick=()=>document.getElementById("modal").classList.add("hidden");

function updatePhotoPreview(){const p=document.getElementById("photoPreview"),r=document.getElementById("removePhoto");if(currentPhoto){p.classList.remove("empty");p.innerHTML=`<img src="${currentPhoto}" alt="">`;r.classList.remove("hidden")}else{p.classList.add("empty");p.innerHTML="🥃";r.classList.add("hidden")}}
function readPhoto(file){if(!file)return;const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>{const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);currentPhoto=c.toDataURL("image/jpeg",.82);updatePhotoPreview()};img.src=e.target.result};reader.readAsDataURL(file)}
document.getElementById("libraryBtn").onclick=()=>document.getElementById("photoLibrary").click();
document.getElementById("cameraBtn").onclick=()=>document.getElementById("photoCamera").click();
document.getElementById("photoLibrary").onchange=e=>readPhoto(e.target.files[0]);
document.getElementById("photoCamera").onchange=e=>readPhoto(e.target.files[0]);
document.getElementById("removePhoto").onclick=()=>{currentPhoto="";updatePhotoPreview()};

document.getElementById("bottleForm").onsubmit=async e=>{
 e.preventDefault();const edit=document.getElementById("editId").value;
 const b={id:edit||id(),name:document.getElementById("name").value.trim(),distillery:document.getElementById("distillery").value.trim(),country:document.getElementById("country").value.trim(),age:Number(document.getElementById("age").value||0),abv:Number(document.getElementById("abv").value||0),volume:Number(document.getElementById("volume").value||0),qty:Number(document.getElementById("qty").value||0),price:Number(document.getElementById("price").value||0),score:Number(document.getElementById("score").value||0),photo:currentPhoto,nose:document.getElementById("nose").value.trim(),palate:document.getElementById("palate").value.trim(),finish:document.getElementById("finish").value.trim(),notes:document.getElementById("notes").value.trim(),updatedAt:new Date().toISOString()};
 if(currentPhoto){b.photoId=b.photoId||("p_"+b.id);await putPhoto(b.photoId,currentPhoto);delete b.photo}
else if(edit){const old=bottles.find(x=>x.id===edit);if(old?.photoId)b.photoId=old.photoId}
if(edit){const i=bottles.findIndex(x=>x.id===edit);bottles[i]=b}else bottles.push(b);
await save();if(currentPhoto)b.photo=currentPhoto;document.getElementById("modal").classList.add("hidden");render()
};

function openExit(i){document.getElementById("exitId").value=i;document.getElementById("exitQty").value=1;document.getElementById("salePrice").value="";document.getElementById("exitModal").classList.remove("hidden")}
document.getElementById("closeExit").onclick=()=>document.getElementById("exitModal").classList.add("hidden");
document.getElementById("exitForm").onsubmit=async e=>{e.preventDefault();const b=bottles.find(x=>x.id===document.getElementById("exitId").value);if(!b)return;const q=Math.max(1,Number(document.getElementById("exitQty").value||1));if(q>Number(b.qty||0)){alert("Quantité supérieure au stock.");return}b.qty-=q;history.push({name:b.name,qty:q,reason:document.getElementById("exitReason").value,salePrice:Number(document.getElementById("salePrice").value||0),date:new Date().toISOString()});await save();document.getElementById("exitModal").classList.add("hidden");render()};

window.applySaved=i=>{const s=saved[i];if(!s)return;document.getElementById("searchInput").value=s.query||"";document.getElementById("filterDistillery").value=s.distillery||"";document.getElementById("filterCountry").value=s.country||"";document.getElementById("filterMinScore").value=s.minScore||"";document.getElementById("filterMaxPrice").value=s.maxPrice||"";document.getElementById("stockOnly").checked=!!s.stock;showView("collectionView")};

function download(name,text){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"application/json"}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
document.getElementById("exportBtn").onclick=()=>download("ma-collection-whisky.json",JSON.stringify({bottles:lightBottles(),history,saved,exportedAt:new Date().toISOString()},null,2));
document.getElementById("backupBtn").onclick=async()=>{await save();download("whisky-collection-sauvegarde.json",JSON.stringify({bottles:lightBottles(),history,saved,backupAt:new Date().toISOString()},null,2));alert("Sauvegarde créée.")}
document.getElementById("restoreBtn").onclick=async()=>{const x=loadJSON(AUTO,null);if(!x){alert("Aucune sauvegarde automatique disponible.");return}if(confirm("Restaurer la sauvegarde automatique ?")){bottles=x.bottles||[];history=x.history||[];saved=x.saved||[];await save();await hydratePhotos();alert("Sauvegarde restaurée.")}}
document.getElementById("importInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);bottles=x.bottles||x.collection||[];history=x.history||[];saved=x.saved||[];await save();await hydratePhotos();alert("Import terminé.")}catch(err){alert("Fichier invalide.")}};r.readAsText(f)}

render();
// V7: move existing base64 photos out of localStorage to avoid the ~5 MB Safari quota.
(async()=>{try{await migratePhotos();await hydratePhotos()}catch(e){console.error(e)}})();

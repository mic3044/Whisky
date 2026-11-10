const KEY="whisky_collection_v2";
const HISTORY="whisky_sales_history_v1";
const SAVED="whisky_saved_searches_v1";

let bottles=load(KEY,[]);
let history=load(HISTORY,[]);
let savedSearches=load(SAVED,[]);
let editingPhoto="";

function load(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch(e){return f}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){alert("Impossible d’enregistrer. La mémoire de l’iPhone est peut-être pleine, notamment à cause des photos.");return false}}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function money(n){return (Number(n)||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR"})}

function showScreen(id){
 document.querySelectorAll(".screen").forEach(x=>x.classList.toggle("active",x.id===id));
 if(id==="home")renderHome();
 if(id==="collection")renderCollection();
 if(id==="history")renderHistory();
 if(id==="stats")renderStats();
 document.querySelectorAll(".bottom button").forEach(b=>b.style.color=b.dataset.screen===id?"#c7a86b":"#8f8d89");
 window.scrollTo({top:0,behavior:"smooth"});
}

function renderHome(){
 const qty=bottles.reduce((s,b)=>s+(+b.qty||0),0);
 const value=bottles.reduce((s,b)=>s+(+b.price||0)*(+b.qty||0),0);
 document.getElementById("homeStats").innerHTML=stat("Bouteilles",qty)+stat("Valeur d’achat",money(value))+stat("Sorties",history.reduce((s,h)=>s+h.qty,0))+stat("Notes",bottles.filter(b=>b.score!==""&&b.score!=null).length);
}
function stat(l,v){return `<div class="stat"><div class="label">${l}</div><div class="value">${v}</div></div>`}

function currentFilters(){
 return {query:document.getElementById("search").value.trim(),distillery:document.getElementById("filterDistillery").value.trim(),country:document.getElementById("filterCountry").value.trim(),minScore:document.getElementById("filterMinScore").value,maxPrice:document.getElementById("filterMaxPrice").value,inStock:document.getElementById("filterStock").checked};
}
function matches(b,f){
 const hay=[b.name,b.distillery,b.country,b.notes].join(" ").toLowerCase();
 if(f.query&&!hay.includes(f.query.toLowerCase()))return false;
 if(f.distillery&&!String(b.distillery||"").toLowerCase().includes(f.distillery.toLowerCase()))return false;
 if(f.country&&!String(b.country||"").toLowerCase().includes(f.country.toLowerCase()))return false;
 if(f.minScore!==""&&(Number(b.score)||0)<Number(f.minScore))return false;
 if(f.maxPrice!==""&&(Number(b.price)||0)>Number(f.maxPrice))return false;
 if(f.inStock&&!(Number(b.qty)>0))return false;
 return true;
}
function renderCollection(){
 const f=currentFilters();
 const list=bottles.filter(b=>matches(b,f));
 document.getElementById("countText").textContent=`${list.length} résultat${list.length>1?"s":""} · ${bottles.reduce((s,b)=>s+(+b.qty||0),0)} bouteille(s) en stock`;
 document.getElementById("collectionList").innerHTML=list.length?list.map(card).join(""):`<div class="empty">Aucune bouteille ne correspond à ta recherche.</div>`;
 renderSaved();
}
function card(b){
 const photo=b.photo?`<img class="bottlePhoto" src="${b.photo}" alt="">`:`<div class="bottlePhoto"></div>`;
 const meta=[b.distillery,b.country,b.age?b.age+" ans":"",b.abv?b.abv+" %":"",b.score!==""&&b.score!=null?"⭐ "+b.score+"/100":""].filter(Boolean).join(" · ");
 return `<div class="bottle">${photo}<div class="bottleInfo"><h3>${esc(b.name)}</h3><div class="muted">${esc(meta)}</div><span class="badge">${b.qty||0} en stock · ${money((+b.price||0)*(+b.qty||0))}</span><div class="actions"><button onclick="stockOut('${b.id}')">📦 Sortir</button><button onclick="openForm('${b.id}')">✏️ Modifier</button><button onclick="deleteBottle('${b.id}')">🗑️</button></div></div></div>`
}
function renderSaved(){
 document.getElementById("savedSearches").innerHTML=savedSearches.length?savedSearches.map(s=>`<div class="savedItem"><button onclick="applySaved('${s.id}')">🔎 ${esc(s.name)}</button><button class="del" onclick="deleteSaved('${s.id}')">✕</button></div>`).join(""):"";
}
function toggleFilters(){document.getElementById("filters").classList.toggle("hidden")}
function saveCurrentSearch(){
 const name=prompt("Nom de cette recherche ?");
 if(!name)return;
 savedSearches.push({id:uid(),name,filters:currentFilters()});
 save(SAVED,savedSearches);renderSaved();
}
function applySaved(id){
 const s=savedSearches.find(x=>x.id===id);if(!s)return;
 const f=s.filters||{};
 document.getElementById("search").value=f.query||"";
 document.getElementById("filterDistillery").value=f.distillery||"";
 document.getElementById("filterCountry").value=f.country||"";
 document.getElementById("filterMinScore").value=f.minScore||"";
 document.getElementById("filterMaxPrice").value=f.maxPrice||"";
 document.getElementById("filterStock").checked=!!f.inStock;
 renderCollection();
}
function deleteSaved(id){if(confirm("Supprimer cette recherche ?")){savedSearches=savedSearches.filter(x=>x.id!==id);save(SAVED,savedSearches);renderSaved()}}

function openForm(id=null){
 document.getElementById("modal").classList.remove("hidden");
 document.getElementById("bottleForm").reset();
 document.getElementById("editId").value=id||"";
 document.getElementById("removePhoto").value="0";
 editingPhoto="";
 document.getElementById("formTitle").textContent=id?"Modifier la bouteille":"Ajouter une bouteille";
 document.getElementById("removePhotoBtn").classList.add("hidden");
 if(id){
  const b=bottles.find(x=>x.id===id);if(!b)return;
  ["name","distillery","country","age","abv","volume","qty","price","score","notes"].forEach(k=>document.getElementById(k).value=b[k]??"");
  editingPhoto=b.photo||"";
  if(editingPhoto)document.getElementById("removePhotoBtn").classList.remove("hidden");
 }
}
function closeForm(){document.getElementById("modal").classList.add("hidden")}
function removeCurrentPhoto(){editingPhoto="";document.getElementById("removePhoto").value="1";document.getElementById("removePhotoBtn").classList.add("hidden")}

function readPhoto(file){
 return new Promise((resolve,reject)=>{
  const r=new FileReader();
  r.onload=()=>{
   const img=new Image();
   img.onload=()=>{
    const max=1000;let w=img.width,h=img.height;
    if(Math.max(w,h)>max){if(w>=h){h=Math.round(h*max/w);w=max}else{w=Math.round(w*max/h);h=max}}
    const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);
    resolve(c.toDataURL("image/jpeg",.78));
   };
   img.onerror=reject;img.src=r.result;
  };
  r.onerror=reject;r.readAsDataURL(file);
 });
}
document.getElementById("bottleForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const id=document.getElementById("editId").value;
 const old=id?bottles.find(x=>x.id===id):null;
 let photo=editingPhoto;
 const file=document.getElementById("photo").files[0];
 if(file){try{photo=await readPhoto(file)}catch(err){alert("Impossible de lire la photo.");return}}
 if(document.getElementById("removePhoto").value==="1")photo="";
 const b={id:id||uid(),name:document.getElementById("name").value.trim(),distillery:document.getElementById("distillery").value.trim(),country:document.getElementById("country").value.trim(),age:document.getElementById("age").value,abv:document.getElementById("abv").value,volume:document.getElementById("volume").value,qty:Math.max(0,Number(document.getElementById("qty").value)||0),price:Math.max(0,Number(document.getElementById("price").value)||0),score:document.getElementById("score").value,notes:document.getElementById("notes").value.trim(),photo};
 if(id)bottles=bottles.map(x=>x.id===id?b:x);else bottles.push(b);
 if(save(KEY,bottles)){closeForm();renderCollection();renderHome();renderStats()}
});

function deleteBottle(id){if(confirm("Supprimer définitivement cette bouteille ?")){bottles=bottles.filter(b=>b.id!==id);save(KEY,bottles);renderCollection();renderHome();renderStats()}}
function stockOut(id){
 const b=bottles.find(x=>x.id===id);if(!b)return;
 const max=Number(b.qty)||0;if(max<=0){alert("Cette bouteille n’est plus en stock.");return}
 let q=Number(prompt(`Combien sortir ? (1 à ${max})`,"1"));if(!Number.isFinite(q)||q<1)return;q=Math.min(Math.floor(q),max);
 const reason=prompt("Motif : vendue / donnée / dégustée / autre","vendue")||"autre";
 let salePrice=0;if(reason.toLowerCase().includes("vend"))salePrice=Number(prompt("Prix de vente total (€)","0"))||0;
 b.qty=max-q;
 history.unshift({id:uid(),date:new Date().toISOString(),bottleId:id,name:b.name,qty:q,reason,salePrice});
 bottles=bottles.filter(x=>x.qty>0);
 save(KEY,bottles);save(HISTORY,history);renderCollection();renderHistory();renderStats();renderHome();
}
function renderHistory(){
 document.getElementById("historyList").innerHTML=history.length?history.map(h=>`<div class="historyItem"><strong>${esc(h.name)} × ${h.qty}</strong><div class="muted">${new Date(h.date).toLocaleDateString("fr-FR")} · ${esc(h.reason)}${h.salePrice?` · ${money(h.salePrice)}`:""}</div></div>`).join(""):`<div class="empty">Aucune sortie enregistrée.</div>`;
}
function renderStats(){
 const qty=bottles.reduce((s,b)=>s+(+b.qty||0),0);
 const value=bottles.reduce((s,b)=>s+(+b.price||0)*(+b.qty||0),0);
 const invested=bottles.reduce((s,b)=>s+(+b.price||0)*(+b.qty||0),0);
 const exited=history.reduce((s,h)=>s+(+h.qty||0),0);
 const revenue=history.reduce((s,h)=>s+(+h.salePrice||0),0);
 document.getElementById("statsGrid").innerHTML=stat("Stock",qty)+stat("Valeur en stock",money(value))+stat("Investi en stock",money(invested))+stat("Bouteilles sorties",exited)+stat("Revenus de ventes",money(revenue))+stat("Références",bottles.length);
}
function exportData(){
 const data={version:3,exportedAt:new Date().toISOString(),bottles,history,savedSearches};
 const blob=new Blob([JSON.stringify(data)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ma-collection-whisky.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function importData(e){
 const file=e.target.files[0];if(!file)return;
 const r=new FileReader();r.onload=()=>{
  try{
   const d=JSON.parse(r.result);
   const incoming=Array.isArray(d)?{bottles:d,history:[],savedSearches:[]}:d;
   if(!Array.isArray(incoming.bottles))throw new Error();
   if(!confirm("Importer ces données et remplacer la collection actuelle ?"))return;
   bottles=incoming.bottles;history=Array.isArray(incoming.history)?incoming.history:[];savedSearches=Array.isArray(incoming.savedSearches)?incoming.savedSearches:[];
   save(KEY,bottles);save(HISTORY,history);save(SAVED,savedSearches);
   renderCollection();renderHistory();renderStats();renderHome();alert("Import terminé.");
  }catch(err){alert("Fichier JSON invalide.");}
 };
 r.readAsText(file);e.target.value="";
}

document.getElementById("search").addEventListener("input",renderCollection);
["filterDistillery","filterCountry","filterMinScore","filterMaxPrice","filterStock"].forEach(id=>document.getElementById(id).addEventListener("input",renderCollection));

// Migration automatique : récupère une ancienne collection stockée sous un ancien nom de clé.
function migrateLegacyCollection(){
  if(Array.isArray(bottles) && bottles.length) return;
  const candidates=["whisky_collection_v1","whisky_collection","whiskyCollection","whisky_bottles","bottles","collection"];
  for(const k of candidates){
    try{
      const raw=localStorage.getItem(k);
      if(!raw) continue;
      const parsed=JSON.parse(raw);
      const arr=Array.isArray(parsed)?parsed:(parsed&&Array.isArray(parsed.bottles)?parsed.bottles:null);
      if(arr && arr.length && arr.some(x=>x && (x.name||x.nom))){
        bottles=arr.map(x=>({
          id:x.id||uid(),
          name:x.name||x.nom||"Whisky",
          distillery:x.distillery||x.distillerie||"",
          country:x.country||x.pays||x.region||"",
          age:x.age??x.âge??"",
          abv:x.abv??x.degre??x.degré??"",
          volume:x.volume??70,
          qty:x.qty??x.quantity??x.quantite??x.quantité??1,
          price:x.price??x.prix??0,
          score:x.score??x.rating??"",
          notes:x.notes||"",
          photo:x.photo||""
        }));
        save(KEY,bottles);
        return;
      }
    }catch(e){}
  }
}
migrateLegacyCollection();

renderHome();renderCollection();renderHistory();renderStats();showScreen("home");

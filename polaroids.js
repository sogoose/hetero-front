(() => {
'use strict';
const LIMIT=24, FOLDER='assets/buildings/', CACHE='hetero-front-buildings-v4', TTL=15*60*1000;
const board=document.querySelector('#photo-board'), status=document.querySelector('#photo-status'), count=document.querySelector('#photo-count');
const scatter=document.querySelector('#scatter'), align=document.querySelector('#align'), shuffle=document.querySelector('#shuffle');
const previous=document.querySelector('#previous'), next=document.querySelector('#next'), pager=document.querySelector('.photo-pagination');
const dialog=document.querySelector('#photo-detail');
let records=[], visible=[], mode='scatter', page=0, demo=false, loading=false, resizeTimer, metadataWarning='', sourceWarning='';
const fallback=[
['elevation.webp','주택 입면'],['specimens.webp','건축 요소의 수집'],['casting.webp','주물 제작 현장'],['brick-factory.webp','벽돌 생산 현장'],['tiles-photo.webp','기와의 기록'],['ornaments.webp','장식의 기록']
].map(([file,title])=>({file,title,src:'assets/archive/'+file,description:'기존 연구자료에서 가져온 미리보기 이미지입니다. 건물 사진을 업로드하면 실제 사진으로 대체됩니다.'}));
function coarseLocation(value){
 const text=String(value||'').replace(/_/g,' ');
 const aliases={'서울':'서울시','서울특별시':'서울시','천안':'천안시','전주':'전주시'};
 const tokens=text.split('(')[0].split(/\s+/).map(t=>aliases[t]||t);
 const result=[];
 for(const token of tokens){
  if(/^[가-힣]+(?:시|구|군|읍|면|동)$/.test(token)){
   result.push(token);
   if(/(?:동|읍|면)$/.test(token))break;
  }
 }
 const city=result.findIndex(t=>t.endsWith('시'));
 return (city>=0?result.slice(city):result).join(' ');
}
function titleOf(file){
 const location=coarseLocation(file);
 const year=String(file).match(/\(((?:19|20)\d{2}[^)]*)\)/)?.[1];
 return location?location+(year?' ('+year+')':''):'풍경의 기록';
}
try{for(const key of ['hetero-front-buildings-v1','hetero-front-buildings-v2'])localStorage.removeItem(key);}catch{}
function sample(items,limit){const result=items.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result.slice(0,limit);}
function readCache(){try{const c=JSON.parse(localStorage.getItem(CACHE));if(c&&Array.isArray(c.files)&&c.files.every(f=>typeof f==='string'&&!f.includes('/')))return c;}catch{}return null;}
async function listFiles(force){
 const cached=readCache();
 if(!force&&cached&&Date.now()-cached.time<TTL)return cached.files;
 try{
  const response=await fetch('https://api.github.com/repos/sogoose/hetero-front/contents/assets/buildings?ref=main',{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
  if(!response.ok)throw new Error('list');
  const data=await response.json();
  if(!Array.isArray(data))throw new Error('format');
  const files=data.filter(f=>f.type==='file'&&/\.(jpe?g|png|webp|avif)$/i.test(f.name)).map(f=>f.name).sort((a,b)=>a.localeCompare(b,'ko',{numeric:true}));
  try{localStorage.setItem(CACHE,JSON.stringify({time:Date.now(),files}));}catch{}
  return files;
 }catch{
  sourceWarning=cached?'사진 목록을 갱신하지 못해 마지막 저장된 목록을 보여줍니다.':'사진 목록에 연결하지 못해 연구자료 미리보기를 보여줍니다. 잠시 후 다시 시도해 주세요.';
  if(cached)return cached.files;
  try{
   const response=await fetch(FOLDER+'photos.json',{cache:'no-store'});
   if(!response.ok)throw new Error('manifest');
   const data=await response.json();
   if(!Array.isArray(data)||!data.every(f=>typeof f==='string'&&!f.includes('/')))throw new Error('manifest');
   sourceWarning='';
   return data;
  }catch{return [];}
 }
}
async function load(force=false){
 if(loading)return; loading=true;shuffle.disabled=true;status.textContent='사진을 펼치는 중입니다.';metadataWarning='';sourceWarning='';
 try{
  const [names,meta]=await Promise.all([listFiles(force),fetch(FOLDER+'metadata.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('metadata');return r.json();}).then(v=>{if(!v||Array.isArray(v)||typeof v!=='object')throw new Error('metadata');return v;}).catch(()=>{metadataWarning='사진 정보 파일을 읽지 못해 파일명을 표시합니다.';return {};})]);
  demo=names.length===0;
  records=demo?fallback:names.map(file=>{
   const info=meta[file]&&typeof meta[file]==='object'?meta[file]:{};
   const record={file,src:FOLDER+encodeURIComponent(file),title:titleOf(file)};
   for(const key of ['title','location','year','material','description','credit'])if(typeof info[key]==='string'&&info[key].trim())record[key]=info[key];
   record.location=coarseLocation(record.location)||coarseLocation(record.title);
   if(record.location){
    const year=record.year||record.title.match(/\(((?:19|20)\d{2}[^)]*)\)/)?.[1];
    record.title=record.location+(year?' ('+year+')':'');
   }
   if(typeof info.thumbnail==='string'&&/^thumbs\/[a-zA-Z0-9._-]+\.webp$/.test(info.thumbnail))record.thumbnail=FOLDER+info.thumbnail;
   return record;
  });
  page=0;render();
 }finally{loading=false;shuffle.disabled=false;}
}
function render(){
 visible=mode==='scatter'?sample(records,LIMIT):records.slice(page*LIMIT,(page+1)*LIMIT);
 board.classList.toggle('is-gallery',mode==='gallery');board.replaceChildren();
 for(const record of visible){
  const button=document.createElement('button');button.type='button';button.className='polaroid';button.setAttribute('aria-label',record.title+' — 상세 보기');
  const frame=document.createElement('span');frame.className='polaroid-image';
  const image=document.createElement('img');image.src=record.thumbnail||record.src;image.alt=record.title;image.loading='lazy';image.decoding='async';image.width=600;image.height=556;
  image.addEventListener('error',()=>{image.hidden=true;frame.textContent='이미지를 불러올 수 없습니다.';frame.style.fontSize='11px';},{once:true});
  frame.append(image);
  const caption=document.createElement('span');caption.className='polaroid-caption';caption.title=record.title;
  const number=document.createElement('span');number.className='polaroid-number';number.textContent=String(records.indexOf(record)+1).padStart(3,'0');
  caption.append(number,document.createTextNode(record.title));button.append(frame,caption);
  button.addEventListener('click',event=>{event.stopPropagation();openDetail(record,button);});
  button.addEventListener("pointermove",event=>{if(event.pointerType!=="mouse"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;const r=button.getBoundingClientRect();button.style.setProperty("--tilt-x",((.5-(event.clientY-r.top)/r.height)*9)+"deg");button.style.setProperty("--tilt-y",(((event.clientX-r.left)/r.width-.5)*9)+"deg");});
  button.addEventListener("pointerleave",()=>{button.style.setProperty("--tilt-x","0deg");button.style.setProperty("--tilt-y","0deg");});board.append(button);
 }
 scatter.setAttribute('aria-pressed',String(mode==='scatter'));align.setAttribute('aria-pressed',String(mode==='gallery'));
 count.textContent=demo?'미리보기 · '+visible.length+'장':records.length+'장 중 '+visible.length+'장';
 status.textContent=[sourceWarning,demo&&!sourceWarning?'건물 사진을 기다리는 동안 기존 연구자료로 미리 보여드립니다.':'',metadataWarning].filter(Boolean).join(' ');
 pager.hidden=mode!=='gallery'||records.length<=LIMIT;
 previous.disabled=page===0;next.disabled=(page+1)*LIMIT>=records.length;
 document.querySelector('#page-number').textContent=(page+1)+' / '+Math.max(1,Math.ceil(records.length/LIMIT));
 layout();
}
function layout(){
 if(mode==='gallery'){board.style.height='';return;}
 const width=board.clientWidth;
 if(!width)return;
 const columns=width<550?2:width<900?3:5;
 const cardWidth=Math.min(width<550?160:235,(width-24)/(columns+.05));
 const cellWidth=(width-cardWidth)/(Math.max(1,columns-1));
 const step=cardWidth*(width<550?1.03:.88);
 const rows=Math.ceil(visible.length/columns);
 board.style.height=Math.max(470,rows*step+cardWidth*.5+70)+'px';
 const slots=sample(Array.from({length:visible.length},(_,i)=>i),visible.length);
 Array.from(board.children).forEach((card,i)=>{
  const slot=slots[i], col=slot%columns,row=Math.floor(slot/columns);
  const jitter=(Math.random()-.5)*cardWidth*.22;
  const x=Math.max(8,Math.min(width-cardWidth-8,col*cellWidth+jitter));
  const y=30+row*step+Math.random()*cardWidth*.25;
  card.style.setProperty('--card-width',cardWidth+'px');card.style.setProperty('--x',x+'px');card.style.setProperty('--y',y+'px');card.style.setProperty('--r',(Math.random()*24-12)+'deg');card.style.zIndex=String(i+1);
 });
}
let picked=null, flipped=false, closing=false;
const focusCard=document.querySelector('.focus-card'),focusStage=document.querySelector('.focus-stage');
function setFlipped(value){
 flipped=value;focusCard.classList.toggle('is-flipped',value);
 document.querySelector('#detail-front').inert=value;
 document.querySelector('#detail-front').setAttribute('aria-hidden',String(value));
 document.querySelector('#detail-back').inert=!value;
 document.querySelector('#detail-back').setAttribute('aria-hidden',String(!value));
 document.querySelector('#detail-flip').setAttribute('aria-pressed',String(value));
 document.querySelector('#detail-flip').textContent=value?'사진 보기':'뒷면 보기';
 if(value)document.querySelector('#detail-flip').focus();
}
function openDetail(record,source){
 picked=source;closing=false;setFlipped(false);
 document.querySelector('#detail-title').textContent=record.title;
 document.querySelector('#detail-caption').textContent=record.title;
 document.querySelector('#detail-back-title').textContent=record.title;
 document.querySelector('#detail-number').textContent=String(records.indexOf(record)+1).padStart(3,'0');
 const image=document.querySelector('#detail-image');image.src=record.src;image.alt=record.title;
 const fields=document.querySelector('#detail-fields');fields.replaceChildren();
 for(const [key,label] of [['location','위치'],['year','연도'],['material','재료']]){
  if(!record[key])continue;
  const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=record[key];fields.append(dt,dd);
 }
 document.querySelector('#detail-description').textContent=record.description||'아직 상세 기록이 등록되지 않았습니다.';
 document.querySelector('#detail-credit').textContent=record.credit||'';
 const origin=source.getBoundingClientRect();
 dialog.showModal();source.classList.add('is-picked');
 const target=focusStage.getBoundingClientRect();
 if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  focusStage.animate([{transform:'translate('+(origin.left+origin.width/2-target.left-target.width/2)+'px,'+(origin.top+origin.height/2-target.top-target.height/2)+'px) scale('+(origin.width/target.width)+')',opacity:.65},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:550,easing:'cubic-bezier(.2,.75,.2,1)'});
 }
 document.querySelector('#detail-front').focus();
}
function closeDetail(){
 if(closing||!dialog.open)return;closing=true;
 const done=()=>{dialog.close();picked?.classList.remove('is-picked');picked?.focus({preventScroll:true});picked=null;closing=false;};
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){done();return;}
 const animation=focusStage.animate([{transform:'translateY(0) scale(1)',opacity:1},{transform:'translateY(18px) scale(.94)',opacity:0}],{duration:180,easing:'ease-in'});
 animation.onfinish=done;
}
document.querySelector('#detail-front').addEventListener('click',()=>setFlipped(true));
document.querySelector('#detail-flip').addEventListener('click',()=>setFlipped(!flipped));
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
scatter.addEventListener('click',()=>{if(mode==='scatter')layout();else{mode='scatter';render();}});
align.addEventListener('click',()=>{mode='gallery';page=0;render();});
shuffle.addEventListener('click',event=>{if(event.shiftKey||sourceWarning){load(true);return;}if(mode==='gallery'){mode='scatter';page=0;}render();});
board.addEventListener('click',event=>{if(event.target===board&&mode==='scatter')layout();});
previous.addEventListener('click',()=>{if(page>0){page--;render();board.scrollIntoView({block:'start'});}});
next.addEventListener('click',()=>{if((page+1)*LIMIT<records.length){page++;render();board.scrollIntoView({block:'start'});}});
document.querySelector('#detail-close').addEventListener('click',closeDetail);
dialog.addEventListener('click',event=>{if(event.target===dialog)closeDetail();});
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(layout,160);});
load();
})();
(() => {
'use strict';

/* MATERIALS — dense, unrolling sheets of transparent cutouts.
   Original image files are unchanged; annotations can be edited locally and exported. */
const main=document.querySelector('.material-main');
const viewport=document.querySelector('#material-window');
const strip=document.querySelector('#material-strip');
const host=document.querySelector('#material-stickers');
const annotationHost=document.querySelector('#material-annotations');
const essayTrigger=document.querySelector('#material-essay-trigger');
const essayDialog=document.querySelector('#material-essay');
const essayClose=document.querySelector('#material-essay-close');
const count=document.querySelector('#material-counter');
const scrubber=document.querySelector('#material-scrubber');
const chapter=document.querySelector('#chapter-menu');
const detail=document.querySelector('#material-detail');
const detailBody=document.querySelector('.material-detail-body');
const editDialog=document.querySelector('#material-editor');
const editToggle=document.querySelector('#material-edit-toggle');
const editForm=document.querySelector('#material-edit-form');
const editName=document.querySelector('#material-edit-title');
const editCategory=document.querySelector('#material-edit-category');
const editDescription=document.querySelector('#material-edit-description');
const editStatus=document.querySelector('#material-edit-status');
const previous=document.querySelector('#material-previous');
const next=document.querySelector('#material-next');
const imageWrap=document.querySelector('#material-detail-art');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const storageKey='hetero_materials_text_edits_v1';
let items=[],pieces=[],sheets=[],maxOffset=0,offset=0,target=0,raf=0,drag=null;
let dragged=false,editing=false,activeItem=null,currentSheet=-1,perBoard=12;
let userInteracted=false;
let atlasMetrics=null;
let coverCount=0;
let changes={},focusedPiece=null;

const fallbackItems=[
 {id:'01',title:'주택의 정면',category:'주택',image:'assets/archive/specimens.webp',width:240,vertical:.22,rotation:0},
 {id:'02',title:'S형 시멘트 기와',category:'기와',image:'assets/archive/tile.webp',width:210,vertical:.48,rotation:0},
 {id:'03',title:'장식 주물 대문',category:'대문',image:'assets/archive/gate.webp',width:220,vertical:.25,rotation:0}
];

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function readChanges(){
 try{const raw=JSON.parse(localStorage.getItem(storageKey)||'{}');return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}}catch{return {}}
}
function saveChanges(){
 try{localStorage.setItem(storageKey,JSON.stringify(changes));return true}catch{return false}
}
function applyChanges(item){
 const draft=changes[item.original||item.source_file||item.id];
 if(!draft)return;
 for(const field of ['title','category','description']){
  if(typeof draft[field]==='string')item[field]=draft[field];
 }
}
function fillLabel(node,item){
 node.textContent=String(item.id).padStart(2,'0');
}
function makePiece(item,index){
 const button=document.createElement('button');
 button.type='button';
 button.className='material-piece';
 button.dataset.index=String(index);
 button.setAttribute('aria-label',item.title+' 자세히 보기');
 const art=document.createElement('span');art.className='material-art';
 const label=document.createElement('span');
 label.className='material-piece-index';fillLabel(label,item);
 button.append(art,label);
 host.append(button);
 const piece={item,index,button,art,label,center:0,loaded:false,sizing:null};
 pieces.push(piece);
 return piece;
}
function createImage(item,alt,onFailure){
 const img=new Image();
 img.className='material-object-image';
 img.alt=alt;img.decoding='async';img.draggable=false;
 let retried=false;
 img.onerror=()=>{
  if(!retried&&item.original&&item.image!==item.original){
   retried=true;img.src=item.original;
  }else if(onFailure)onFailure();
 };
 // A per-image revision invalidates stale browser-cached WebPs after trim.
 img.src=item.image+(item.assetRevision?'?v='+encodeURIComponent(item.assetRevision):'');
 return img;
}
function attachImage(piece){
 const {item,art,sizing:{width,height}}=piece;
 art.replaceChildren();
 art.style.width=width+'px';art.style.height=height+'px';
 art.append(createImage(item,'',()=>{art.classList.add('has-error')}));
 piece.loaded=true;
}
function getSheetForOffset(scroll){
 if(!sheets.length)return 0;
 const midpoint=scroll+viewport.clientWidth*.52;
 let best=0,distance=Infinity;
 for(let i=0;i<sheets.length;i++){
  const d=Math.abs(sheets[i].centre-midpoint);
  if(d<distance){best=i;distance=d}
 }
 return best;
}

/* Palette classification happens from the actual same-origin optimized images,
   not guesses about file names. Tiny 36px alpha-aware samples are cached locally. */
const paletteCacheKey='hetero_material_palette_v2';
const typeRanks={'벽체':0,'지붕':1,'난간':2,'대문':3,'장식':4,'주택':5};
const sampleCanvas=document.createElement('canvas');
sampleCanvas.width=36;sampleCanvas.height=36;
const sampleContext=sampleCanvas.getContext('2d',{willReadFrequently:true});

function roughFamily(item){
 const t=(item.title||'')+' '+(item.category||'');
 if(/벽돌|테라코타|적색|붉은/.test(t))return 3;
 if(/시멘트|콘크리트|화강석|석재/.test(t))return 1;
 if(/녹색|청록|담쟁이|화분/.test(t))return 6;
 if(/푸른|청회색/.test(t))return 8;
 return 2;
}
function colorFamily(img,item){
 if(!sampleContext)return {family:roughFamily(item),tone:0.5};
 const w=sampleCanvas.width,h=sampleCanvas.height;
 sampleContext.clearRect(0,0,w,h);
 try{sampleContext.drawImage(img,0,0,w,h)}catch{return {family:roughFamily(item),tone:.5}}
 let px;
 try{px=sampleContext.getImageData(0,0,w,h).data}catch{return {family:roughFamily(item),tone:.5}}
 const bins=new Array(10).fill(0);
 let avg=0,total=0;
 for(let i=0;i<px.length;i+=4){
  const alpha=px[i+3]/255;
  if(alpha<.22)continue;
  const r=px[i]/255,g=px[i+1]/255,b=px[i+2]/255;
  const hi=Math.max(r,g,b),lo=Math.min(r,g,b),delta=hi-lo;
  const light=(hi+lo)/2;
  if(light>.97)continue;
  const sat=delta===0?0:delta/(1-Math.abs(2*light-1));
  let group=0;
  if(sat<.15 || delta<.09){
   group=light>.68?0:light>.35?1:2;
  }else{
   let hue=0;
   if(hi===r)hue=((g-b)/delta)%6;
   else if(hi===g)hue=(b-r)/delta+2;
   else hue=(r-g)/delta+4;
   hue=(hue*60+360)%360;
   group=hue<35||hue>=345?3:hue<70?4:hue<150?5:hue<192?6:hue<250?7:hue<290?8:9;
  }
  const weight=alpha*(sat>=.15?1.5:1);
  bins[group]+=weight;
  avg+=light*weight;total+=weight;
 }
 if(!total)return {family:roughFamily(item),tone:.5};
 // Broad color first; near colors then converge by brightness and material.
 const family=bins.indexOf(Math.max(...bins));
 return {family,tone:avg/total};
}
function sampleImage(item){
 return new Promise(resolve=>{
  const img=new Image();
  let done=false;
  const timeout=setTimeout(()=>finish(null),4000);
  function finish(value){
   if(done)return;done=true;clearTimeout(timeout);
   img.onload=null;img.onerror=null;resolve(value||{family:roughFamily(item),tone:.5});
  }
  img.onload=()=>finish(colorFamily(img,item));
  img.onerror=()=>finish(null);
  img.src=item.image+(item.assetRevision?'?v='+encodeURIComponent(item.assetRevision):'');
 });
}
const coverIDs=['09','12','01','04','36','22'];
function curateCover(list){
 const chosen=coverIDs.map(id=>list.find(v=>String(v.id).padStart(2,'0')===id)).filter(Boolean);
 const seen=new Set(chosen);
 list.splice(0,list.length,...chosen,...list.filter(v=>!seen.has(v)));
}
function paletteCompare(a,b){
 const ac=a._palette||{family:roughFamily(a),tone:.5};
 const bc=b._palette||{family:roughFamily(b),tone:.5};
 return ac.family-bc.family
  ||(typeRanks[a.category]??8)-(typeRanks[b.category]??8)
  ||ac.tone-bc.tone
  ||Number(a.id)-Number(b.id);
}
async function sortByPalette(entries){
 let cached={};
 try{cached=JSON.parse(localStorage.getItem(paletteCacheKey)||'{}')||{}}catch{}
 let cursor=0;
 const workers=Array.from({length:8},async()=>{
  while(cursor<entries.length){
   const item=entries[cursor++];
   const key=item.image+'@'+(item.assetRevision||'');
   let palette=cached[key];
   if(!palette||!Number.isFinite(palette.family)){
    palette=await sampleImage(item);
    cached[key]=palette;
   }
   item._palette=palette;
  }
 });
 await Promise.all(workers);
 try{localStorage.setItem(paletteCacheKey,JSON.stringify(cached))}catch{}
 return entries.sort(paletteCompare);
}


/* Like an annotated printed object atlas: the images share a dense invisible
   arrangement and the index is composed independently in small columns below. */

function drawAnnotation(column,piece){
 const item=piece.item;
 const el=document.createElement('div');el.className='material-annotation-entry';
 el.dataset.index=String(piece.index);
 const no=document.createElement('span');no.className='material-annotation-number';no.textContent=String(item.id).padStart(2,'0');
 const copy=document.createElement('div');copy.className='material-annotation-copy';
 const name=document.createElement('span');name.className='material-annotation-name';name.textContent=item.title;
 const sub=document.createElement('span');sub.className='material-annotation-description';
 const desc=(item.description||'').trim();
 sub.textContent=desc&&desc!=='혼종의 정면에서 수집한 건축 요소의 이미지 아카이브.'?desc:(item.category||'');
 copy.append(name,sub);el.append(no,copy);column.append(el);
}
function renderAnnotations(){
 if(!atlasMetrics||!annotationHost)return;
 const {cols,rows,legendTop,sheetWidth,coverWidth}=atlasMetrics;
 const fragment=document.createDocumentFragment();
 for(let sheet=0;sheet<sheets.length;sheet++){
  const cover=sheet===0,ncols=cover?(viewport.clientWidth<700?2:3):cols;
  const panel=document.createElement('section');panel.className='material-annotation-board';
  if(cover)panel.classList.add('material-cover-annotations');
  panel.style.left=(sheets[sheet].start+(cover?10:0))+'px';
  panel.style.top=legendTop+'px';
  panel.style.width=(cover?coverWidth-20:sheetWidth)+'px';
  panel.style.gridTemplateColumns='repeat('+ncols+',minmax(0,1fr))';
  const slots=cover?coverCount:perBoard;
  for(let col=0;col<ncols;col++){
   const column=document.createElement('div');column.className='material-annotation-column';
   for(let row=0;row<Math.ceil(slots/ncols);row++){
    const index=cover?row*ncols+col:coverCount+(sheet-1)*perBoard+row*ncols+col;
    if(cover&&index>=coverCount)continue;
    if(!cover&&index>=coverCount+sheet*perBoard)continue;
    if(pieces[index])drawAnnotation(column,pieces[index]);
   }
   panel.append(column);
  }
  fragment.append(panel);
 }
 annotationHost.replaceChildren(fragment);
}
function layout(){
 if(!pieces.length)return;
 const vw=viewport.clientWidth,vh=viewport.clientHeight;
 const mobile=vw<700,cols=mobile?4:vw<1070?6:8,rows=vh<440?3:5;
 perBoard=cols*rows;
 coverCount=Math.min(coverIDs.length,pieces.length,perBoard-1);
 const coverWidth=mobile?clamp(vw*.99,330,460):clamp(vw*.52,620,820);
 const sheetWidth=mobile?clamp(vw*1.16,420,620):clamp(vw*1.025,940,1540);
 const gap=mobile?16:28,spacing=mobile?15:29,tail=mobile?vw*.25:vw*.29;
 const boardTop=clamp(vh*.035,12,32);
 const legendTop=Math.round(vh*(mobile?.735:.755));
 const imageBottom=legendTop-(mobile?16:23);
 const imageHeight=Math.max(190,imageBottom-boardTop);
 const cellW=sheetWidth/cols,cellH=imageHeight/rows;
 const nBoards=Math.ceil((pieces.length-coverCount)/perBoard);
 const pockets=mobile?[
  [.04,.035,.18,.23],[.39,.055,.45,.15],
  [.025,.40,.18,.24],[.78,.37,.17,.29],
  [.12,.75,.28,.16],[.58,.74,.29,.17]
 ]:[
  [.045,.04,.17,.24],[.40,.055,.45,.14],
  [.025,.41,.18,.24],[.79,.40,.17,.29],
  [.11,.76,.29,.17],[.56,.74,.30,.18]
 ];
 const intro=document.querySelector('.material-intro');
 intro.style.width=coverWidth+'px';intro.style.height=imageBottom+'px';
 sheets=[{start:0,centre:coverWidth/2,width:coverWidth,top:boardTop,height:imageHeight}];
 for(let g=0;g<nBoards;g++){
  const start=coverWidth+gap+g*(sheetWidth+spacing);
  sheets.push({start,centre:start+sheetWidth/2,width:sheetWidth,top:boardTop,height:imageHeight});
 }
 const sx=[-.035,.04,-.035,.025,.045,-.035,.025,-.035],sy=[-.035,.045,-.02,.015,.04,-.035,.015,-.02],sc=[.96,1.02,.93,1.04,.98,1.03,.94,1];
 pieces.forEach(piece=>{
  const {index,item,art,button}=piece;
  const aspect=Math.max(1,Number(item.imageWidth)||300)/Math.max(1,Number(item.imageHeight)||300);
  let x,y,width,height;
  if(index<coverCount){
   const [px,py,pw,ph]=pockets[index];
   const maxW=coverWidth*pw,maxH=imageHeight*ph;
   width=Math.max(14,Math.round(Math.min(maxW,maxH*aspect)));height=Math.max(14,Math.round(width/aspect));
   x=Math.round(coverWidth*px+(maxW-width)/2);
   y=Math.round(boardTop+imageHeight*py+(maxH-height)/2);
  }else{
   const n=index-coverCount,group=Math.floor(n/perBoard),cell=n%perBoard;
   const col=cell%cols,row=Math.floor(cell/cols),board=sheets[group+1];
   const x0=board.start+col*cellW,y0=boardTop+row*cellH;
   const maxW=cellW-(mobile?13:23),maxH=cellH-(mobile?7:13),scale=sc[n%sc.length];
   width=Math.max(14,Math.round(Math.min(maxW*scale,maxH*scale*aspect)));
   height=Math.max(14,Math.round(width/aspect));
   x=Math.round(clamp(x0+(cellW-width)/2+sx[n%sx.length]*cellW,x0+3,x0+cellW-width-4));
   y=Math.round(clamp(y0+(cellH-height)/2+sy[n%sy.length]*cellH,y0+2,y0+cellH-height-3));
  }
  piece.sizing={width,height};
  if(piece.lastWidth!==width||piece.lastHeight!==height){art.replaceChildren();piece.loaded=false;piece.lastWidth=width;piece.lastHeight=height}
  art.style.width=width+'px';art.style.height=height+'px';
  button.style.left=x+'px';button.style.top=y+'px';button.style.width=width+'px';button.style.height=height+'px';
  button.style.setProperty('--art-height',height+'px');
  piece.center=x+width/2;
 });
 strip.style.width=Math.ceil(Math.max(vw,coverWidth+gap+nBoards*(sheetWidth+spacing)+tail))+'px';
 atlasMetrics={cols,rows,legendTop,sheetWidth,coverWidth};renderAnnotations();
 maxOffset=Math.max(0,strip.offsetWidth-vw);
 offset=clamp(offset,0,maxOffset);target=clamp(target,0,maxOffset);
 currentSheet=-1;schedule();
}
function redraw(){
 strip.style.transform='translate3d('+(-offset).toFixed(1)+'px,0,0)';
 const sheet=getSheetForOffset(offset);
 if(sheet!==currentSheet){
  currentSheet=sheet;
  const start=sheet===0?1:coverCount+(sheet-1)*perBoard+1;
  const end=sheet===0?coverCount:Math.min(items.length,coverCount+sheet*perBoard);
  count.textContent=String(start).padStart(2,'0')+'–'+String(end).padStart(2,'0')+' / '+items.length;
 }
 previous.disabled=sheet===0&&offset<30;
 next.disabled=sheet===sheets.length-1&&offset>maxOffset-30;
 scrubber.value=String(maxOffset?Math.round(offset/maxOffset*1000):0);
 scrubber.setAttribute('aria-valuetext',Math.round((maxOffset?offset/maxOffset:0)*100)+'%');
 const buffer=viewport.clientWidth*.92;
 pieces.forEach(piece=>{
  const px=piece.center-offset;
  const w=piece.sizing.width;
  const visible=px>-w*.6&&px<viewport.clientWidth+w*.6;
  piece.button.classList.toggle('in-view',visible);
  if(px>-buffer&&px<viewport.clientWidth+buffer){
   if(!piece.loaded)attachImage(piece);
  }else if(piece.loaded){
   piece.art.replaceChildren();piece.loaded=false;
  }
 });
}
function tick(){
 raf=0;
 const d=target-offset;
 offset=reduced.matches||Math.abs(d)<.3?target:offset+d*.17;
 redraw();
 if(Math.abs(target-offset)>.3)schedule();
}
function schedule(){if(!raf)raf=requestAnimationFrame(tick)}
function setPosition(value){target=clamp(value,0,maxOffset);schedule()}
function navigateSheet(index){
 const sheet=sheets[clamp(index,0,sheets.length-1)];
 if(!sheet)return;
 setPosition(sheet.centre-viewport.clientWidth*.5);
}
function showDetail(piece){
 const source=piece.art.getBoundingClientRect();
 if(!source.width||!source.height)return;
 const vw=window.innerWidth,vh=window.innerHeight;
 const limitW=Math.min(vw*.86,880),limitH=Math.min(vh*.78,750);
 const scale=Math.max(1,Math.min(3.8,limitW/source.width,limitH/source.height));
 const width=Math.round(source.width*scale),height=Math.round(source.height*scale);
 imageWrap.replaceChildren();
 const img=createImage(piece.item,piece.item.title,()=>{});
 img.loading='eager';imageWrap.append(img);
 imageWrap.style.width=width+'px';imageWrap.style.height=height+'px';
 detailBody.style.width=width+'px';detailBody.style.height=height+'px';
 detail.showModal();
 const dest=imageWrap.getBoundingClientRect();
 if(!reduced.matches&&dest.width){
  const dx=source.left+source.width/2-(dest.left+dest.width/2);
  const dy=source.top+source.height/2-(dest.top+dest.height/2);
  imageWrap.animate([
   {transform:'translate('+dx+'px,'+dy+'px) scale('+(source.width/dest.width)+')',opacity:.5},
   {transform:'translate(0px,0px) scale(1)',opacity:1}
  ],{duration:420,easing:'cubic-bezier(.18,.8,.2,1)'});
 }
 focusedPiece=piece;
 piece.button.classList.add('is-inspected');
}
function openEditor(item){
 activeItem=item;
 editName.value=item.title||'';
 editCategory.value=item.category||'';
 editDescription.value=item.description||'';
 editStatus.textContent='이 브라우저에 임시 저장됩니다. GitHub 반영은 JSON 내보내기를 사용하세요.';
 editDialog.showModal();
 editName.focus();
 editName.select();
}
function renamePiece(item){
 const piece=pieces.find(p=>p.item===item);
 if(piece){
  fillLabel(piece.label,item);
  piece.button.setAttribute('aria-label',item.title+' 자세히 보기');
  renderAnnotations();
 }
}
function exportJSON(){
 const blob=new Blob([JSON.stringify(items.map(item=>Object.fromEntries(Object.entries(item).filter(([key])=>!key.startsWith('_')))).sort((a,b)=>Number(a.id)-Number(b.id)),null,2)+'\n'],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;a.download='stickers-updated.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 editStatus.textContent='JSON 파일을 다운로드했습니다. GitHub 자료에 반영할 수 있습니다.';
}
function startDrag(e){
 if(e.button!==0||detail.open||chapter.open||editDialog.open||essayDialog.open)return;
 userInteracted=true;
 drag={x:e.clientX,start:target};
 dragged=false;main.classList.add('is-grabbing');
}
function moveDrag(e){
 if(!drag)return;
 const dx=e.clientX-drag.x;
 if(Math.abs(dx)>7)dragged=true;
 if(dragged)setPosition(drag.start-dx);
}
function endDrag(){if(drag){drag=null;main.classList.remove('is-grabbing')}}
// Editing stays in the original on-page editor; the annotation itself is also selectable.
annotationHost.addEventListener('click',event=>{
 if(!editing)return;
 const entry=event.target.closest('.material-annotation-entry');
 if(!entry)return;
 const piece=pieces[Number(entry.dataset.index)];
 if(piece)openEditor(piece.item);
});
// The heading is a reading trigger, not a horizontal-drag surface.
essayTrigger.addEventListener('pointerdown',event=>event.stopPropagation());
essayTrigger.addEventListener('click',event=>{
 event.stopPropagation();
 essayTrigger.setAttribute('aria-expanded','true');
 main.classList.add('is-reading');
 essayDialog.showModal();
 essayClose.focus({preventScroll:true});
});
essayClose.addEventListener('click',()=>essayDialog.close());
essayDialog.addEventListener('click',event=>{if(event.target===essayDialog)essayDialog.close()});
essayDialog.addEventListener('close',()=>{
 essayTrigger.setAttribute('aria-expanded','false');
 main.classList.remove('is-reading');
 essayTrigger.focus({preventScroll:true});
});
viewport.addEventListener('pointerdown',startDrag);
window.addEventListener('pointermove',moveDrag);
window.addEventListener('pointerup',endDrag);
window.addEventListener('pointercancel',endDrag);
viewport.addEventListener('click',e=>{
 const element=e.target.closest('.material-piece');
 if(!element)return;
 if(dragged){e.preventDefault();dragged=false;return}
 const piece=pieces[Number(element.dataset.index)];
 if(!piece)return;
 if(editing)openEditor(piece.item);
 else showDetail(piece);
});
window.addEventListener('wheel',e=>{
 if(detail.open||chapter.open||editDialog.open||essayDialog.open||e.ctrlKey)return;
 userInteracted=true;
 e.preventDefault();
 let delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
 if(e.deltaMode===1)delta*=19;
 if(e.deltaMode===2)delta*=viewport.clientWidth;
 setPosition(target+delta*.9);
},{passive:false});
window.addEventListener('keydown',e=>{
 if(detail.open||chapter.open||editDialog.open||essayDialog.open)return;
 if(e.key==='ArrowRight'){e.preventDefault();navigateSheet(currentSheet+1)}
 if(e.key==='ArrowLeft'){e.preventDefault();navigateSheet(currentSheet-1)}
 if(e.key==='Home'){e.preventDefault();setPosition(0)}
 if(e.key==='End'){e.preventDefault();setPosition(maxOffset)}
});
previous.addEventListener('click',()=>navigateSheet(currentSheet-1));
next.addEventListener('click',()=>navigateSheet(currentSheet+1));
scrubber.addEventListener('input',()=>{userInteracted=true;setPosition(maxOffset*Number(scrubber.value)/1000)});
document.querySelector('#chapter-open').addEventListener('click',()=>chapter.showModal());
document.querySelector('#chapter-close').addEventListener('click',()=>chapter.close());
chapter.addEventListener('click',e=>{if(e.target===chapter)chapter.close()});
detail.addEventListener('close',()=>{
 if(focusedPiece)focusedPiece.button.classList.remove('is-inspected');
 focusedPiece=null;
});
detail.addEventListener('click',()=>detail.close());
editToggle.addEventListener('click',()=>{
 editing=!editing;
 main.classList.toggle('is-editing',editing);
 editToggle.setAttribute('aria-pressed',String(editing));
 editToggle.textContent=editing?'DONE':'EDIT';
 editToggle.title=editing?'편집 종료':'재료 이름 편집';
});
document.querySelector('#material-editor-close').addEventListener('click',()=>editDialog.close());
editDialog.addEventListener('click',e=>{if(e.target===editDialog)editDialog.close()});
editForm.addEventListener('submit',e=>{
 e.preventDefault();
 if(!activeItem)return;
 const title=editName.value.trim().slice(0,90);
 if(!title){editName.focus();return}
 activeItem.title=title;
 activeItem.category=editCategory.value.trim().slice(0,60);
 activeItem.description=editDescription.value.trim().slice(0,1000);
 const key=activeItem.original||activeItem.source_file||activeItem.id;
 changes[key]={title:activeItem.title,category:activeItem.category,description:activeItem.description};
 renamePiece(activeItem);
 const saved=saveChanges();
 editDialog.close();
 if(!saved)console.warn('Local text draft could not be stored.');
});
document.querySelector('#material-editor-export').addEventListener('click',exportJSON);
document.querySelector('#material-editor-reset').addEventListener('click',()=>{
 if(!activeItem)return;
 const source=baseItems.find(v=>v.original===activeItem.original||v.id===activeItem.id);
 if(!source)return;
 for(const key of ['title','category','description'])activeItem[key]=source[key]||'';
 delete changes[activeItem.original||activeItem.source_file||activeItem.id];
 saveChanges();renamePiece(activeItem);
 editDialog.close();
});
window.addEventListener('resize',()=>{
 const fraction=maxOffset?offset/maxOffset:0;
 layout();
 setPosition(maxOffset*fraction);
});

let baseItems=[];
async function start(){
 try{
  const response=await fetch('assets/materials/stickers.json',{cache:'no-cache'});
  if(!response.ok)throw Error('Manifest '+response.status);
  const json=await response.json();
  if(!Array.isArray(json)||!json.length)throw Error('Empty materials');
  baseItems=json;
 }catch(error){
  console.warn('Falling back to archived specimens:',error);
  baseItems=fallbackItems;
 }
 changes=readChanges();
 items=baseItems.map(v=>({...v}));
 items.forEach(applyChanges);
 // Show the atlas immediately. Cached real-color samples are used on return visits.
 let cache={};
 try{cache=JSON.parse(localStorage.getItem(paletteCacheKey)||'{}')||{}}catch{}
 let uncached=0;
 for(const item of items){
  const key=item.image+'@'+(item.assetRevision||'');
  if(cache[key]&&Number.isFinite(cache[key].family))item._palette=cache[key];
  else uncached++;
 }
 items.sort(paletteCompare);
 curateCover(items);
 items.forEach(makePiece);
 layout();
 redraw();
 if(uncached){
  // First visit: refine actual pixel colors without blocking the visible collection.
  sortByPalette([...items]).then(sorted=>{
   if(userInteracted)return;
   const fraction=maxOffset?offset/maxOffset:0;
   items=sorted;curateCover(items);
   for(const piece of pieces)piece.button.remove();
   pieces=[];currentSheet=-1;
   items.forEach(makePiece);
   layout();setPosition(maxOffset*fraction);
  }).catch(error=>console.warn('Palette scan unavailable:',error));
 }
}
start();
})();
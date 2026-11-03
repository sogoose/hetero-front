(() => {
'use strict';

/* MATERIALS — dense, unrolling sheets of transparent cutouts.
   Original image files are unchanged; annotations can be edited locally and exported. */
const main=document.querySelector('.material-main');
const viewport=document.querySelector('#material-window');
const strip=document.querySelector('#material-strip');
const host=document.querySelector('#material-stickers');
const count=document.querySelector('#material-counter');
const scrubber=document.querySelector('#material-scrubber');
const chapter=document.querySelector('#chapter-menu');
const detail=document.querySelector('#material-detail');
const editDialog=document.querySelector('#material-editor');
const editToggle=document.querySelector('#material-edit-toggle');
const editForm=document.querySelector('#material-edit-form');
const editName=document.querySelector('#material-edit-title');
const editCategory=document.querySelector('#material-edit-category');
const editDescription=document.querySelector('#material-edit-description');
const editStatus=document.querySelector('#material-edit-status');
const previous=document.querySelector('#material-previous');
const next=document.querySelector('#material-next');
const arrange=document.querySelector('#material-arrange');
const imageWrap=document.querySelector('#material-detail-art');
const detailTitle=document.querySelector('#material-detail-title');
const detailType=document.querySelector('#material-detail-type');
const detailDescription=document.querySelector('#material-detail-description');
const detailSequence=document.querySelector('#material-detail-sequence');
const detailSource=document.querySelector('#material-detail-source');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const storageKey='hetero_materials_text_edits_v1';
let items=[],pieces=[],sheets=[],maxOffset=0,offset=0,target=0,raf=0,drag=null;
let dragged=false,aligned=false,editing=false,activeItem=null,currentSheet=-1;
let changes={};

/* Lightly scattered editorial collage at three staggered heights. */
const scatterSlots=[
 [.06,.13,1.09,-4], [.28,.41,.87,3],
 [.70,.06,1.03,-3], [.05,.78,.94,4],
 [.76,.86,.91,-4], [.41,.87,.82,2],
 [.72,.39,1.00,5], [.35,.08,.79,-2]
];
const gridSlots=[
 [.06,.08,.88,0], [.35,.08,.88,0],
 [.66,.08,.88,0], [.06,.40,.88,0],
 [.35,.40,.88,0], [.66,.40,.88,0],
 [.21,.74,.88,0], [.56,.74,.88,0]
];
const scatterMobile=[
 [.04,.13,1.04,-3], [.52,.31,.89,4],
 [.14,.69,.95,3], [.61,.71,1.02,-4]
];
const gridMobile=[
 [.05,.12,.91,0], [.53,.12,.91,0],
 [.05,.66,.91,0], [.53,.66,.91,0]
];
const slotOrders=[
 [0,1,2,3,4,5,6,7],
 [2,0,7,5,1,4,3,6],
 [6,3,0,4,2,7,1,5],
 [4,6,2,0,5,3,7,1]
];

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
 node.replaceChildren();
 const number=document.createElement('span');number.className='material-label-no';
 number.textContent=String(item.id).padStart(2,'0');
 const title=document.createElement('span');title.className='material-label-name';
 title.textContent=item.title;
 node.append(number,title);
}
function makePiece(item,index){
 const button=document.createElement('button');
 button.type='button';
 button.className='material-piece';
 button.dataset.index=String(index);
 button.setAttribute('aria-label',item.title+' 자세히 보기');
 const art=document.createElement('span');art.className='material-art';
 const label=document.createElement('span');
 label.className='material-piece-title';fillLabel(label,item);
 button.append(art,label);
 host.append(button);
 const piece={item,index,button,art,label,center:0,loaded:false,sizing:null};
 pieces.push(piece);
 return piece;
}
function sizing(item,mobile,scale){
 const density=mobile?(viewport.clientWidth<380?.88:1):(viewport.clientWidth<1250?.89:1);
 const width=Math.round(clamp(
  (Number(item.width)||260)*(mobile?.46:.57)*scale*density,
  mobile?81:97,mobile?173:239));
 const ratio=item.category==='지붕'?.68
  :item.category==='난간'?.60
  :item.category==='벽체'?.72
  :item.category==='대문'?.94:1.05;
 const height=Math.round(Math.min(width*ratio,viewport.clientHeight*.46));
 return {width,height};
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
 img.src=item.image;
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
function layout(){
 if(!pieces.length)return;
 const vw=viewport.clientWidth,vh=viewport.clientHeight;
 const mobile=vw<700;
 const perSheet=mobile?4:8;
 const sheetWidth=mobile?clamp(vw*1.06,350,460):clamp(vw*.66,710,935);
 const lead=mobile?Math.max(vw*.35,150):Math.max(vw*.35,440);
 const tail=mobile?vw*.42:vw*.50;
 const sheetSpacing=mobile?15:27;
 const groupCount=Math.ceil(pieces.length/perSheet);
 const styleSlots=mobile?(aligned?gridMobile:scatterMobile):(aligned?gridSlots:scatterSlots);
 sheets=[];
 for(let group=0;group<groupCount;group++){
  const x0=lead+group*(sheetWidth+sheetSpacing);
  const center=x0+sheetWidth*.5;
  sheets.push({start:x0,centre:center});
 }
 pieces.forEach(piece=>{
  const {item,index,button,art}=piece;
  const group=Math.floor(index/perSheet);
  const cell=index%perSheet;
  const slot=(!aligned&&!mobile)?slotOrders[group%slotOrders.length][cell]:cell;
  const [sx,sy,scale,rotation]=styleSlots[slot];
  const sheetVariation=aligned?0:(group%4-1.5);
  const shape=sizing(item,mobile,scale);
  const {width,height}=shape;
  piece.sizing=shape;
  if(piece.lastWidth!==width||piece.lastHeight!==height){
   art.replaceChildren();piece.loaded=false;
   piece.lastWidth=width;piece.lastHeight=height;
  }
  art.style.width=width+'px';art.style.height=height+'px';
  const shiftX=aligned?0:sheetVariation*(mobile?3:8);
  const shiftY=aligned?0:((index*7+group*11)%5-2)*(mobile?5:10);
  const left=sx*(sheetWidth-width*.84)+shiftX;
  const x=sheets[group].start+clamp(left,10,sheetWidth-width*.82);
  const avail=Math.max(40,vh-height-76);
  const y=clamp(21+sy*avail+shiftY,22,vh-height-38);
  button.style.left=Math.round(x)+'px';
  button.style.top=Math.round(y)+'px';
  button.style.width=width+'px';
  button.style.setProperty('--rotation',aligned?'0deg':(rotation+(item.rotation||0)*.16)+'deg');
  piece.center=x+width*.5;
 });
 strip.style.width=Math.ceil(lead+groupCount*(sheetWidth+sheetSpacing)+tail)+'px';
 maxOffset=Math.max(0,strip.offsetWidth-vw);
 offset=clamp(offset,0,maxOffset);
 target=clamp(target,0,maxOffset);
 schedule();
}
function redraw(){
 strip.style.transform='translate3d('+(-offset).toFixed(1)+'px,0,0)';
 const sheet=getSheetForOffset(offset);
 if(sheet!==currentSheet){
  currentSheet=sheet;
  const n=viewport.clientWidth<700?4:8;
  const start=sheet*n+1,end=Math.min(items.length,(sheet+1)*n);
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
 const item=piece.item;
 detailTitle.textContent=item.title;
 detailType.textContent=item.category||'MATERIAL';
 detailSequence.textContent='MATERIAL '+item.id+' / '+items.length;
 detailDescription.textContent=item.description||'';
 detailSource.textContent=item.detailSource||'';
 imageWrap.replaceChildren();
 const img=createImage(item,item.title,()=>{});
 img.loading='eager';imageWrap.append(img);
 detail.showModal();
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
 }
}
function exportJSON(){
 const blob=new Blob([JSON.stringify(items,null,2)+'\n'],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;a.download='stickers-updated.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 editStatus.textContent='JSON 파일을 다운로드했습니다. GitHub 자료에 반영할 수 있습니다.';
}
function startDrag(e){
 if(e.button!==0||detail.open||chapter.open||editDialog.open)return;
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
 if(detail.open||chapter.open||editDialog.open||e.ctrlKey)return;
 e.preventDefault();
 let delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
 if(e.deltaMode===1)delta*=19;
 if(e.deltaMode===2)delta*=viewport.clientWidth;
 setPosition(target+delta*.9);
},{passive:false});
window.addEventListener('keydown',e=>{
 if(detail.open||chapter.open||editDialog.open)return;
 if(e.key==='ArrowRight'){e.preventDefault();navigateSheet(currentSheet+1)}
 if(e.key==='ArrowLeft'){e.preventDefault();navigateSheet(currentSheet-1)}
 if(e.key==='Home'){e.preventDefault();setPosition(0)}
 if(e.key==='End'){e.preventDefault();setPosition(maxOffset)}
});
previous.addEventListener('click',()=>navigateSheet(currentSheet-1));
next.addEventListener('click',()=>navigateSheet(currentSheet+1));
arrange.addEventListener('click',()=>{
 aligned=!aligned;
 main.classList.toggle('is-aligned',aligned);
 arrange.setAttribute('aria-pressed',String(aligned));
 arrange.title=aligned?'스티커 흩어 보기':'스티커 가지런히 보기';
 layout();
});
scrubber.addEventListener('input',()=>setPosition(maxOffset*Number(scrubber.value)/1000));
document.querySelector('#chapter-open').addEventListener('click',()=>chapter.showModal());
document.querySelector('#chapter-close').addEventListener('click',()=>chapter.close());
chapter.addEventListener('click',e=>{if(e.target===chapter)chapter.close()});
document.querySelector('#material-detail-close').addEventListener('click',()=>detail.close());
detail.addEventListener('click',e=>{if(e.target===detail)detail.close()});
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
 items.forEach(makePiece);
 layout();
 redraw();
}
start();
})();
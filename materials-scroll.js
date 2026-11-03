(() => {
'use strict';

const main=document.querySelector('.material-main');
const viewport=document.querySelector('#material-window');
const strip=document.querySelector('#material-strip');
const host=document.querySelector('#material-stickers');
const counter=document.querySelector('#material-counter');
const scrubber=document.querySelector('#material-scrubber');
const chapter=document.querySelector('#chapter-menu');
const detail=document.querySelector('#material-detail');
const previous=document.querySelector('#material-previous');
const next=document.querySelector('#material-next');
const arrange=document.querySelector('#material-arrange');
const imageWrap=document.querySelector('#material-detail-art');
const detailTitle=document.querySelector('#material-detail-title');
const detailType=document.querySelector('#material-detail-type');
const detailDescription=document.querySelector('#material-detail-description');
const detailSequence=document.querySelector('#material-detail-sequence');
const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let items=[],pieces=[],maxOffset=0,offset=0,target=0,currentIndex=-1,raf=0,drag=null,dragMoved=false,arranged=false;
const atlasSize=[546,942];

const fallbackItems=[
 {id:'01',title:'주택의 정면',category:'주택',image:'assets/materials/sticker-01.webp',fallback:{type:'crop',src:'assets/archive/specimens.webp',rect:[12,5,167,108]},width:270,vertical:.22,rotation:-4},
 {id:'02',title:'S형 시멘트 기와',category:'기와',image:'assets/materials/sticker-02.webp',fallback:{type:'image',src:'assets/archive/tile.webp'},width:302,vertical:.44,rotation:5},
 {id:'03',title:'장식 주물 대문',category:'주물',image:'assets/materials/sticker-03.webp',fallback:{type:'image',src:'assets/archive/gate.webp'},width:290,vertical:.15,rotation:-3}
];

function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
function buildFallback(item,width){
 const fb=item.fallback||{type:'image',src:'assets/archive/specimens.webp'};
 if(fb.type==='crop' && Array.isArray(fb.rect)){
  const [x,y,w,h]=fb.rect;
  const scale=width/w;
  const crop=document.createElement('div');
  crop.className='material-crop';
  crop.style.width=width+'px';
  crop.style.height=Math.round(h*scale)+'px';
  crop.style.backgroundImage='url("'+fb.src+'")';
  crop.style.backgroundSize=(atlasSize[0]*scale)+'px '+(atlasSize[1]*scale)+'px';
  crop.style.backgroundPosition=(-x*scale)+'px '+(-y*scale)+'px';
  crop.setAttribute('aria-hidden','true');
  return crop;
 }
 const img=document.createElement('img');
 img.className='material-object-image';
 img.src=fb.src;
 img.alt='';
 img.draggable=false;
 return img;
}
function makePiece(item,index){
 const button=document.createElement('button');
 button.className='material-piece';
 button.type='button';
 button.dataset.index=String(index);
 button.setAttribute('aria-label',item.title+' 자세히 보기');
 const art=document.createElement('span');
 art.className='material-art';
 const number=document.createElement('span');
 number.className='material-piece-number';
 number.textContent='M / '+item.id;
 const label=document.createElement('span');
 label.className='material-piece-title';
 label.textContent=item.title;
 const caption=document.createElement('span');
 caption.className='material-piece-meta';
 caption.textContent=item.category.toUpperCase();
 button.append(art,number,label,caption);
 host.append(button);
 pieces.push({item,button,art,index,center:0});
 return button;
}
function sizing(item){
 const mobile=window.innerWidth<700;
 const factor=mobile?.74:1;
 const width=Math.min(item.width*factor,viewport.clientWidth*(mobile?.67:.39),mobile?280:380);
 const fb=item.fallback||{};
 const ratio=fb.type==='crop'&&fb.rect?fb.rect[3]/fb.rect[2]
  :item.category==='벽돌'?.43:item.category==='기와'?.77:1.02;
 const height=Math.min(width*ratio,viewport.clientHeight*.59);
 return {width,height};
}
function putArtwork(piece,width,height){
 const {item,art}=piece;
 art.replaceChildren();
 art.style.width=width+'px';
 art.style.height=height+'px';
 // Show the historical cutout first; upgrade automatically when the final image is uploaded.
 const backup=buildFallback(item,width);
 art.append(backup);
 const finalImage=new Image();
 finalImage.className='material-object-image';
 finalImage.alt='';
 finalImage.draggable=false;
 finalImage.decoding='async';
 finalImage.onload=()=>{art.replaceChildren(finalImage)};
 finalImage.onerror=()=>{};
 finalImage.src=item.image;
}
function layout(){
 if(!pieces.length)return;
 const mobile=window.innerWidth<700;
 const vw=viewport.clientWidth,vh=viewport.clientHeight;
 const gap=clamp(vw*.46,mobile?300:380,mobile?400:620);
 const lead=mobile?vw*.72:vw*.64;
 const tail=mobile?vw*.65:vw*.68;
 pieces.forEach(piece=>{
  const {item,button,index}=piece;
  const {width,height}=sizing(item);
  if(!piece.lastWidth||Math.abs(piece.lastWidth-width)>1){
   putArtwork(piece,width,height);
   piece.lastWidth=width;
  }
  const y=clamp(vh*item.vertical,38,vh-height-(mobile?58:80));
  const x=lead+index*gap+(index%3===2?30:0);
  button.style.left=x+'px';
  button.style.top=y+'px';
  button.style.width=width+'px';
  button.style.setProperty('--rotation',item.rotation+'deg');
  piece.center=x+width*.5;
 });
 const width=lead+(pieces.length-1)*gap+360+tail;
 strip.style.width=width+'px';
 maxOffset=Math.max(0,width-vw);
 offset=clamp(offset,0,maxOffset);
 target=clamp(target,0,maxOffset);
 schedule();
}
function nearestIndex(){
 if(!pieces.length)return 0;
 const centre=offset+viewport.clientWidth*.5;
 let chosen=0,shortest=Infinity;
 pieces.forEach((piece,index)=>{
  const d=Math.abs(piece.center-centre);
  if(d<shortest){shortest=d;chosen=index}
 });
 return chosen;
}
function redraw(){
 strip.style.transform='translate3d('+(-offset).toFixed(2)+'px,0,0)';
 const index=nearestIndex();
 if(index!==currentIndex){
  currentIndex=index;
  counter.textContent=String(index+1).padStart(2,'0')+' / '+String(items.length).padStart(2,'0');
  previous.disabled=index===0&&offset<30;
  next.disabled=index===items.length-1&&offset>maxOffset-30;
 }
 scrubber.value=String(maxOffset?Math.round(offset/maxOffset*1000):0);
 scrubber.setAttribute('aria-valuetext','전체 길이의 '+Math.round((maxOffset?offset/maxOffset:0)*100)+'%');
 pieces.forEach(piece=>{
  const position=piece.center-offset;
  piece.button.classList.toggle('in-view',position>0&&position<viewport.clientWidth);
 });
}
function tick(){
 raf=0;
 const delta=target-offset;
 if(prefersReduced.matches||Math.abs(delta)<.35)offset=target;
 else offset+=delta*.14;
 redraw();
 if(Math.abs(target-offset)>=.35)schedule();
}
function schedule(){if(!raf)raf=requestAnimationFrame(tick)}
function setPosition(value){target=clamp(value,0,maxOffset);schedule()}
function navigateTo(index){
 if(!pieces.length)return;
 const piece=pieces[clamp(index,0,pieces.length-1)];
 setPosition(piece.center-viewport.clientWidth*.5);
}
function detailMedia(item,container,width){
 container.replaceChildren();
 const wrapper=document.createElement('span');
 wrapper.className='material-detail-media';
 wrapper.style.width=Math.min(width,350)+'px';
 const fb=buildFallback(item,Math.min(width,350));
 wrapper.append(fb);
 container.append(wrapper);
 const actual=new Image();
 actual.alt=item.title;
 actual.draggable=false;
 actual.decoding='async';
 actual.onload=()=>wrapper.replaceChildren(actual);
 actual.onerror=()=>{};
 actual.src=item.image;
}
function showDetail(piece){
 const item=piece.item;
 detailTitle.textContent=item.title;
 detailType.textContent=item.category+' / MATERIAL ARCHIVE';
 detailSequence.textContent='STICKER '+item.id+' / '+items.length;
 detailDescription.textContent=item.description||'주택의 정면에서 수집한 건축 요소.';
 detailMedia(item,imageWrap,Math.min(380,window.innerWidth*.7));
 detail.showModal();
}
function startPointer(event){
 if(event.button!==0||detail.open||chapter.open)return;
 drag={x:event.clientX,y:event.clientY,start:target};
 dragMoved=false;
 main.classList.add('is-grabbing');
}
function movePointer(event){
 if(!drag)return;
 const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
 if(Math.abs(dx)+Math.abs(dy)>7)dragMoved=true;
 if(dragMoved)setPosition(drag.start-dx);
}
function stopPointer(){
 if(!drag)return;
 drag=null;
 main.classList.remove('is-grabbing');
}
viewport.addEventListener('pointerdown',startPointer);
window.addEventListener('pointermove',movePointer);
window.addEventListener('pointerup',stopPointer);
window.addEventListener('pointercancel',stopPointer);
viewport.addEventListener('click',event=>{
 const pieceElement=event.target.closest('.material-piece');
 if(!pieceElement)return;
 if(dragMoved){event.preventDefault();dragMoved=false;return}
 const piece=pieces[Number(pieceElement.dataset.index)];
 if(piece)showDetail(piece);
});
window.addEventListener('wheel',event=>{
 if(detail.open||chapter.open)return;
 if(event.ctrlKey)return; // Preserve browser zoom.
 event.preventDefault();
 let delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
 if(event.deltaMode===1)delta*=19;
 if(event.deltaMode===2)delta*=viewport.clientWidth;
 setPosition(target+delta*.95);
},{passive:false});
window.addEventListener('keydown',event=>{
 if(detail.open||chapter.open)return;
 if(event.key==='ArrowRight'){event.preventDefault();navigateTo(currentIndex+1)}
 if(event.key==='ArrowLeft'){event.preventDefault();navigateTo(currentIndex-1)}
 if(event.key==='Home'){event.preventDefault();setPosition(0)}
 if(event.key==='End'){event.preventDefault();setPosition(maxOffset)}
});
previous.addEventListener('click',()=>navigateTo(currentIndex-1));
next.addEventListener('click',()=>navigateTo(currentIndex+1));
arrange.addEventListener('click',()=>{
 arranged=!arranged;
 main.classList.toggle('is-aligned',arranged);
 arrange.setAttribute('aria-pressed',String(arranged));
 arrange.title=arranged?'스티커 흩어놓기':'스티커 정렬하기';
});
scrubber.addEventListener('input',()=>setPosition(maxOffset*Number(scrubber.value)/1000));
document.querySelector('#chapter-open').addEventListener('click',()=>chapter.showModal());
document.querySelector('#chapter-close').addEventListener('click',()=>chapter.close());
chapter.addEventListener('click',event=>{if(event.target===chapter)chapter.close()});
document.querySelector('#material-detail-close').addEventListener('click',()=>detail.close());
detail.addEventListener('click',event=>{if(event.target===detail)detail.close()});
window.addEventListener('resize',()=>{
 const fraction=maxOffset?offset/maxOffset:0;
 layout();
 setPosition(maxOffset*fraction);
});

async function start(){
 try{
  const response=await fetch('assets/materials/stickers.json',{cache:'no-cache'});
  if(!response.ok)throw Error('manifest '+response.status);
  const json=await response.json();
  if(!Array.isArray(json)||!json.length)throw Error('manifest empty');
  items=json;
 }catch(error){
  console.warn('Using offline materials samples:',error);
  items=fallbackItems;
 }
 for(const [index,item] of items.entries())makePiece(item,index);
 layout();
 redraw();
}
start();
})();

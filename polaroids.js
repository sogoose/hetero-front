(() => {
'use strict';
const LIMIT=24, FOLDER='assets/buildings/', CACHE='hetero-front-buildings-v4', TTL=15*60*1000;
const board=document.querySelector('#photo-board'), status=document.querySelector('#photo-status'), count=document.querySelector('#photo-count');
const scatter=document.querySelector('#scatter'), align=document.querySelector('#align'), shuffle=document.querySelector('#shuffle');
const previous=document.querySelector('#previous'), next=document.querySelector('#next'), pager=document.querySelector('.photo-pagination');
const dialog=document.querySelector('#photo-detail');
let records=[], visible=[], mode='scatter', page=0, demo=false, loading=false, resizeTimer, metadataWarning='', sourceWarning='';
let pageSize=24,bodies=[],drag=null,frame=0,lastFrame=0,topLayer=30,boardWidth=0,boardHeight=0;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
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
 stopMotion();
 pageSize=capacity();page=clamp(page,0,Math.max(0,Math.ceil(records.length/pageSize)-1));
 visible=mode==='scatter'?sample(records,pageSize):records.slice(page*pageSize,(page+1)*pageSize);
 board.classList.toggle('is-gallery',mode==='gallery');board.replaceChildren();bodies=[];
 for(const record of visible){
  const button=document.createElement('button');button.type='button';button.className='polaroid';button.setAttribute('aria-label',record.title+' — 상세 보기');
  const frame=document.createElement('span');frame.className='polaroid-image';
  const image=document.createElement('img');image.src=record.thumbnail||record.src;image.alt=record.title;image.loading='lazy';image.decoding='async';image.width=600;image.height=556;
  image.addEventListener('error',()=>{image.hidden=true;frame.textContent='이미지를 불러올 수 없습니다.';frame.style.fontSize='11px';},{once:true});
  frame.append(image);
  const caption=document.createElement('span');caption.className='polaroid-caption';caption.title=record.title;
  const number=document.createElement('span');number.className='polaroid-number';number.textContent=String(records.indexOf(record)+1).padStart(3,'0');
  const title=document.createElement('span');title.className='polaroid-title';title.textContent=record.title;
  caption.append(number,title);button.append(frame,caption);image.draggable=false;
  const body={el:button,record,x:0,y:0,r:0,vx:0,vy:0,vr:0,w:0,h:0,target:null};
  bodies.push(body);
  button.addEventListener('click',event=>{
   event.stopPropagation();
   if(event.detail>0&&performance.now()<(button._suppressUntil||0)){event.preventDefault();return;}
   openDetail(record,button);
  });
  button.addEventListener('pointerdown',event=>startDrag(event,body));
  board.append(button);
 }
 scatter.setAttribute('aria-pressed',String(mode==='scatter'));align.setAttribute('aria-pressed',String(mode==='gallery'));
 count.textContent=demo?'미리보기 · '+visible.length+'장':records.length+'장 중 '+visible.length+'장';
 status.textContent=[sourceWarning,demo&&!sourceWarning?'건물 사진을 기다리는 동안 기존 연구자료로 미리 보여드립니다.':'',metadataWarning].filter(Boolean).join(' ');
 pager.hidden=mode!=='gallery'||records.length<=pageSize;
 previous.disabled=page===0;next.disabled=(page+1)*pageSize>=records.length;
 document.querySelector('#page-number').textContent=(page+1)+' / '+Math.max(1,Math.ceil(records.length/pageSize));
 layout();
}
function capacity(){
 const w=board.clientWidth||window.innerWidth,h=board.clientHeight||window.innerHeight;
 return w<570?(h<400?8:12):(h<420?16:LIMIT);
}
function stopMotion(){
 if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;
 if(drag){drag.body.el.classList.remove('is-dragging');drag=null;}
}
function gridFor(n,w,h){
 let best={columns:1,rows:n,width:0};
 const gap=w<570?12:22;
 for(let columns=1;columns<=Math.min(n,10);columns++){
  const rows=Math.ceil(n/columns);
  const width=Math.min(210,(w-gap*(columns+1))/columns,(h-gap*(rows+1))/rows*.79);
  if(width>best.width)best={columns,rows,width,gap};
 }
 return best;
}
function paint(body){
 body.el.style.setProperty('--x',body.x.toFixed(2)+'px');
 body.el.style.setProperty('--y',body.y.toFixed(2)+'px');
 body.el.style.setProperty('--r',body.r.toFixed(2)+'deg');
}
function bounds(body){
 const angle=body.r*Math.PI/180;
 const rotatedW=Math.abs(body.w*Math.cos(angle))+Math.abs(body.h*Math.sin(angle));
 const rotatedH=Math.abs(body.h*Math.cos(angle))+Math.abs(body.w*Math.sin(angle));
 const xMargin=Math.max(5,(rotatedW-body.w)/2+6),yMargin=Math.max(5,(rotatedH-body.h)/2+6);
 const minX=Math.min(xMargin,(boardWidth-body.w)/2);
 const minY=Math.min(yMargin,(boardHeight-body.h)/2);
 return {minX,maxX:Math.max(minX,boardWidth-body.w-minX),minY,maxY:Math.max(minY,boardHeight-body.h-minY)};
}
function contain(body,bounce=true){
 const limits=bounds(body),x=clamp(body.x,limits.minX,limits.maxX),y=clamp(body.y,limits.minY,limits.maxY);
 if(bounce&&x!==body.x)body.vx*=-.38;
 if(bounce&&y!==body.y)body.vy*=-.38;
 body.x=x;body.y=y;
}
function scatterTargets(animate=true){
 const columns=Math.max(2,Math.round(Math.sqrt(bodies.length*boardWidth/boardHeight)));
 const rows=Math.ceil(bodies.length/columns);
 const slots=sample(Array.from({length:bodies.length},(_,i)=>i),bodies.length);
 bodies.forEach((body,index)=>{
  const slot=slots[index],col=slot%columns,row=Math.floor(slot/columns);
  const target={x:(col+.5+(Math.random()-.5)*.95)*boardWidth/columns-body.w/2,
   y:(row+.5+(Math.random()-.5)*.95)*boardHeight/rows-body.h/2,r:(Math.random()-.5)*64};
  const probe={...body,...target};contain(probe,false);
  target.x=probe.x;target.y=probe.y;
  if(animate&&!reducedMotion.matches){body.target=target;body.vx=0;body.vy=0;body.vr=0;}
  else{Object.assign(body,target);body.target=null;paint(body);}
 });
 wake();
}
function layout(){
 const oldW=boardWidth,oldH=boardHeight;
 boardWidth=board.clientWidth;boardHeight=board.clientHeight;
 if(!boardWidth||!boardHeight||!bodies.length)return;
 const grid=gridFor(bodies.length,boardWidth,boardHeight);
 const scatterWidth=clamp(Math.sqrt(boardWidth*boardHeight/(bodies.length*.72*1.27)),boardWidth<570?102:135,boardWidth<570?165:240);
 const width=mode==='gallery'?Math.max(35,grid.width):Math.min(scatterWidth,boardWidth*.55,boardHeight*.57);
 bodies.forEach(body=>{body.w=width;body.h=width/.79;body.el.style.setProperty('--card-width',width+'px');body.vx=body.vy=body.vr=0;});
 if(mode==='gallery'){
  const rowHeight=width/.79+grid.gap;
  const top=(boardHeight-(grid.rows*rowHeight-grid.gap))/2;
  bodies.forEach((body,index)=>{
   const row=Math.floor(index/grid.columns),col=index%grid.columns;
   const itemsInRow=Math.min(grid.columns,bodies.length-row*grid.columns);
   const left=(boardWidth-(itemsInRow*(width+grid.gap)-grid.gap))/2;
   body.target={x:left+col*(width+grid.gap),y:top+row*rowHeight,r:0};
   if(!oldW||reducedMotion.matches){Object.assign(body,body.target);body.target=null;paint(body);}
  });
  wake();
 }else if(!oldW||bodies.some(body=>!body.el.style.getPropertyValue('--x'))){
  scatterTargets(false);
 }else{
  bodies.forEach(body=>{body.x*=boardWidth/oldW;body.y*=boardHeight/oldH;body.target=null;contain(body,false);paint(body);});
 }
}
function wake(){
 if(!frame&&!document.hidden&&!dialog.open&&!reducedMotion.matches)frame=requestAnimationFrame(tick);
}
function tick(time){
 frame=0;
 if(document.hidden||dialog.open){lastFrame=0;return;}
 const dt=lastFrame?clamp((time-lastFrame)/16.667,.4,2):1;lastFrame=time;
 let active=false;
 for(const body of bodies){
  if(drag?.body===body)continue;
  if(body.target){
   if(mode==='gallery'){
    body.x+=(body.target.x-body.x)*Math.min(1,.2*dt);
    body.y+=(body.target.y-body.y)*Math.min(1,.2*dt);
    body.r+=(body.target.r-body.r)*Math.min(1,.2*dt);
   }else{
    body.vx+=(body.target.x-body.x)*.018*dt;
    body.vy+=(body.target.y-body.y)*.018*dt;
    body.vr+=(body.target.r-body.r)*.018*dt;
   }
   if(Math.abs(body.target.x-body.x)+Math.abs(body.target.y-body.y)+Math.abs(body.target.r-body.r)<.5&&Math.abs(body.vx)+Math.abs(body.vy)<.5){
    Object.assign(body,body.target);body.target=null;body.vx=body.vy=body.vr=0;
   }
  }
  if(mode==='scatter'){
   body.vx=clamp(body.vx,-30,30)*Math.pow(.90,dt);
   body.vy=clamp(body.vy,-30,30)*Math.pow(.90,dt);
   body.vr=clamp(body.vr,-3.5,3.5)*Math.pow(.90,dt);
   body.x+=body.vx*dt;body.y+=body.vy*dt;body.r=clamp(body.r+body.vr*dt,-65,65);
   contain(body);
  }
  paint(body);
  if(body.target||Math.abs(body.vx)+Math.abs(body.vy)+Math.abs(body.vr)>.055)active=true;
  else body.vx=body.vy=body.vr=0;
 }
 if(active)wake();else lastFrame=0;
}
function localPoint(event){
 const rect=board.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};
}
function startDrag(event,body){
 if(mode!=='scatter'||!event.isPrimary||event.button!==0||dialog.open||drag)return;
 event.preventDefault();
 const p=localPoint(event);
 body.target=null;body.vx=body.vy=body.vr=0;
 body.el.style.zIndex=String(++topLayer);
 drag={body,id:event.pointerId,start:p,last:p,offsetX:p.x-body.x,offsetY:p.y-body.y,time:performance.now(),moved:false};
 body.el.setPointerCapture(event.pointerId);
}
function movePointer(event){
 if(dialog.open||mode!=='scatter')return;
 const p=localPoint(event);
 if(drag){
  if(event.pointerId!==drag.id)return;
  const body=drag.body,now=performance.now(),elapsed=Math.max(8,now-drag.time);
  if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>6)drag.moved=true;
  if(drag.moved){
   body.el.classList.add('is-dragging');
   const vx=(p.x-drag.last.x)/elapsed*16.667,vy=(p.y-drag.last.y)/elapsed*16.667;
   body.vx=clamp(body.vx*.35+vx*.65,-28,28);body.vy=clamp(body.vy*.35+vy*.65,-28,28);
   body.vr=clamp(body.vx*.055,-1.2,1.2);
   body.x=p.x-drag.offsetX;body.y=p.y-drag.offsetY;contain(body,false);paint(body);
  }
  drag.last=p;drag.time=now;
  return;
 }
 if(event.pointerType!=='mouse'||reducedMotion.matches)return;
 for(const body of bodies){
  const dx=body.x+body.w/2-p.x,dy=body.y+body.h/2-p.y;
  const distance=Math.hypot(dx,dy),radius=body.w*.55+65;
  if(distance<radius&&distance>1){
   const strength=Math.pow(1-distance/radius,2)*2.6;
   body.target=null;body.vx+=dx/distance*strength;body.vy+=dy/distance*strength;body.vr+=dx/radius*strength*.10;
  }
 }
 wake();
}
function finishDrag(event,cancel=false){
 if(!drag||event.pointerId!==drag.id)return;
 const state=drag,body=state.body;drag=null;
 body.el.classList.remove('is-dragging');
 body.el._suppressUntil=performance.now()+450;
 if(body.el.hasPointerCapture(event.pointerId))body.el.releasePointerCapture(event.pointerId);
 if(cancel||performance.now()-state.time>100||reducedMotion.matches)body.vx=body.vy=body.vr=0;
 if(!state.moved&&!cancel)openDetail(body.record,body.el);
 else wake();
}
function wheelMix(event){
 if(mode!=='scatter'||dialog.open||event.ctrlKey)return;
 event.preventDefault();
 if(reducedMotion.matches)return;
 const p=localPoint(event),scale=event.deltaMode===1?18:event.deltaMode===2?boardHeight:1;
 const magnitude=clamp(Math.hypot(event.deltaX,event.deltaY)*scale/130,.12,1.7),direction=Math.sign(event.deltaY||event.deltaX)||1;
 for(const body of bodies){
  const dx=body.x+body.w/2-p.x,dy=body.y+body.h/2-p.y,distance=Math.max(60,Math.hypot(dx,dy));
  const strength=magnitude*(3+Math.random()*5);
  body.target=null;body.vx+=(-dy/distance*direction+(Math.random()-.5)*1.5)*strength;
  body.vy+=(dx/distance*direction+(Math.random()-.5)*1.5)*strength;
  body.vr+=(Math.random()-.5)*magnitude*2.8;
 }
 wake();
}
board.addEventListener('pointermove',movePointer);
board.addEventListener('pointerup',event=>finishDrag(event));
board.addEventListener('pointercancel',event=>finishDrag(event,true));
board.addEventListener('lostpointercapture',event=>finishDrag(event,true));
board.addEventListener('wheel',wheelMix,{passive:false});
board.addEventListener('dragstart',event=>event.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMotion();});
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
 stopMotion();picked=source;closing=false;setFlipped(false);
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
scatter.addEventListener('click',()=>{if(mode==='scatter')scatterTargets();else{mode='scatter';board.classList.remove('is-gallery');layout();scatterTargets();scatter.setAttribute('aria-pressed','true');align.setAttribute('aria-pressed','false');pager.hidden=true;}});
align.addEventListener('click',()=>{mode='gallery';board.classList.add('is-gallery');layout();scatter.setAttribute('aria-pressed','false');align.setAttribute('aria-pressed','true');pager.hidden=records.length<=pageSize;});
shuffle.addEventListener('click',event=>{if(event.shiftKey||sourceWarning){load(true);return;}if(mode==='gallery'){mode='scatter';page=0;}render();});
board.addEventListener('click',event=>{if(event.target===board&&mode==='scatter')scatterTargets();});
previous.addEventListener('click',()=>{if(page>0){page--;render();}});
next.addEventListener('click',()=>{if((page+1)*pageSize<records.length){page++;render();}});
document.querySelector('#detail-close').addEventListener('click',closeDetail);
dialog.addEventListener('click',event=>{if(event.target===dialog)closeDetail();});
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(capacity()!==pageSize)render();else layout();},120);});
load();
})();
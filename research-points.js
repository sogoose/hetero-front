/* HETERO FRONT / Factory annotations — read-only.
   Factory point records remain published in assets/research/factory-points.json.
   Overview clusters, pin selection, zoom and floating text labels are preserved. */
(() => {
'use strict';
const $=s=>document.querySelector(s);
const context={getSelection:null,selectMaterial:null,isAvailable:null};
const state={points:[],selected:null,initialized:false,viewKey:null};
const materialLabels={brick:'벽돌',cast:'주물',tile:'기와'};
const panel=$('#research-factory-panel');
function el(tag,className,txt){
 const e=document.createElement(tag);
 if(className)e.className;
 if(className)e.className=className;
 if(txt!==undefined&&txt!==null)e.textContent=String(txt);
 return e;
}
function cleanPoint(p){
 if(!p||!materialLabels[p.material]||![1991,2026].includes(Number(p.year)))return null;
 const x=Number(p.x),y=Number(p.y);
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1)return null;
 if(!p.id||!String(p.name||'').trim())return null;
 return {
  id:String(p.id).slice(0,80),name:String(p.name).trim().slice(0,130),
  material:p.material,year:Number(p.year),
  x:Number(x.toFixed(6)),y:Number(y.toFixed(6)),
  region:String(p.region||'').slice(0,140),
  tileType:p.material==='tile'&&['점토기와','시멘트기와'].includes(p.tileType)?p.tileType:'',
  note:String(p.note||'').slice(0,600),
  source:String(p.source||'').slice(0,250)
 };
}
function activeSelection(){return context.getSelection?context.getSelection():{year:1991,material:'brick'}}
function visiblePoints(){
 const {year,material}=activeSelection();
 return state.points.filter(p=>p.year===year&&(material==='combined'||p.material===material));
}
function findImage(material){
 // A DXF point is calibrated to its material's transparent overlay artboard.
 // Never assume an independently exported base map has identical dimensions.
 if(material){
  const overlay=$('#research-map-art .research-map-overlay--'+material);
  if(overlay)return overlay;
 }
 return $('#research-map-art .research-map-stack .research-map-base');
}

/* Nearby DXF points often occupy the same few screen pixels around Seoul.
   Cluster by RENDERED distance so every linked company remains reachable. */
/* Keep geographically distinct groups separate (no transitive chains across
   a whole province). Never combine different materials: the counter can then
   inherit the corresponding blue, green, or terracotta map legend color. */
function clusterByScreenDistance(projected,radius){
 const sorted=projected.slice().sort((a,b)=>{
  const byMaterial=a.point.material.localeCompare(b.point.material);
  return byMaterial||a.screenX-b.screenX||a.screenY-b.screenY;
 });
 const groups=[];
 sorted.forEach(item=>{
  let closest=null,best=Infinity;
  for(const group of groups){
   if(group.material!==item.point.material)continue;
   const d=Math.hypot(group.cx-item.screenX,group.cy-item.screenY);
   if(d>radius||d>=best)continue;
   // Bounding each cluster prevents large chains of adjacent symbols.
   if(!group.items.every(p=>Math.hypot(p.screenX-item.screenX,p.screenY-item.screenY)<=radius*1.46))continue;
   closest=group;best=d;
  }
  if(!closest){
   groups.push({material:item.point.material,cx:item.screenX,cy:item.screenY,items:[item]});
  }else{
   const n=closest.items.length;
   closest.cx=(closest.cx*n+item.screenX)/(n+1);
   closest.cy=(closest.cy*n+item.screenY)/(n+1);
   closest.items.push(item);
  }
 });
 return groups.map(g=>g.items);
}
function pointNumber(point){
 const matched=String(point.id).match(/(\d+)$/);
 return matched?matched[1].padStart(2,'0'):'·';
}
function showCluster(points){
 state.selected=null;
 panel.replaceChildren();
 const top=el('div','research-factory-summary');
 const title=el('h2','research-factory-name',points.length+'곳의 업체');
 const close=el('button','research-factory-close','×');
 close.type='button';close.setAttribute('aria-label','목록 닫기');
 close.addEventListener('click',()=>{panel.hidden=true});
 top.append(title,close);
 const hint=el('p','research-factory-subtitle','가까운 지점에 기록된 업체입니다. 이름을 누르면 상세 정보가 열립니다.');
 const list=el('div','research-factory-cluster-list');
 points.slice().sort((a,b)=>pointNumber(a).localeCompare(pointNumber(b),'ko')).forEach(point=>{
  const button=el('button','research-factory-cluster-entry');
  button.type='button';
  button.append(el('span','research-factory-cluster-index',pointNumber(point)),
    el('span','research-factory-cluster-name',point.name));
  button.setAttribute('aria-label',point.name+' 업체 정보 보기');
  button.addEventListener('click',()=>selectPoint(point));
  list.append(button);
 });
 panel.append(top,hint,list);
 panel.hidden=false;
}
/* Overview: show only significant numbered clusters, plus a handful of
   genuinely isolated maker names. Zooming progressively separates dense
   groups; single-site map markers remain the original printed PNG symbols. */
function positionPins(){
 const wrap=$('#research-map-art .research-factory-pins');
 const map=$('#research-map-art');
 if(!wrap||!map)return;
 const root=wrap.getBoundingClientRect(),view=map.getBoundingClientRect();
 if(!root.width||!view.width)return;
 // Counters and annotations live OUTSIDE the transformed bitmap/vector
 // stack. Their native font rasterization is no longer scaled by zoom.
 const stack=map.querySelector('.research-map-stack');
 const scale=Number(stack?.dataset.zoomScale||1)||1;
 const selection=activeSelection();
 const projected=visiblePoints().map(point=>{
  const img=findImage(point.material),bounds=img?.getBoundingClientRect();
  if(!bounds||!bounds.width||!bounds.height)return null;
  const screenX=bounds.left+point.x*bounds.width;
  const screenY=bounds.top+point.y*bounds.height;
  return {
   point,screenX,screenY,
   left:Math.round(screenX-root.left),
   top:Math.round(screenY-root.top)
  };
 }).filter(Boolean);
 // Radius is measured in SCREEN pixels, not original map pixels. It gets
 // smaller as the reader zooms, which reveals progressively finer detail.
 const radius=Math.max(20,40-5*(scale-1));
 const groups=clusterByScreenDistance(projected,radius);
 const fragment=document.createDocumentFragment();
 const visibleClusterCenters=[];
 const withinView=(x,y,margin=12)=>x>=view.left+margin&&x<=view.right-margin&&y>=view.top+margin&&y<=view.bottom-margin;
 for(const group of groups){
  const points=group.map(item=>item.point);
  // Pairs are legible as two printed map marks at overview; number them
  // only after a modest zoom. Larger concentrations are labeled immediately.
  if(points.length<(scale<1.55?3:2))continue;
  const screenX=group.reduce((a,item)=>a+item.screenX,0)/group.length;
  const screenY=group.reduce((a,item)=>a+item.screenY,0)/group.length;
  if(!withinView(screenX,screenY))continue;
  const left=Math.round(group.reduce((a,item)=>a+item.left,0)/group.length);
  const top=Math.round(group.reduce((a,item)=>a+item.top,0)/group.length);
  const button=el('button','research-factory-pin is-cluster',String(points.length));
  button.type='button';
  button.dataset.material=points[0].material;
  button.style.left=left+'px';
  button.style.top=top+'px';
  // An untransformed screen-space layer keeps all counter text sharp.
  button.style.transform='translate(-50%,-50%)';
  button.title=points.length+'곳의 '+materialLabels[points[0].material]+' 업체 보기';
  button.setAttribute('aria-label',button.title);
  if(state.selected&&points.some(p=>p.id===state.selected))button.classList.add('is-active');
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   showCluster(points);
  });
  fragment.append(button);
  visibleClusterCenters.push({x:screenX,y:screenY});
 }
 // Labels act as tiny architectural annotations, not additional map icons.
 // Show only far-apart isolated companies and leave the rest as printed dots.
 const candidates=groups.filter(g=>g.length===1).map(g=>{
  const item=g[0];
  const nearest=projected.reduce((d,other)=>{
   if(other===item)return d;
   return Math.min(d,Math.hypot(other.screenX-item.screenX,other.screenY-item.screenY));
  },Infinity);
  return {...item,nearest};
 }).sort((a,b)=>b.nearest-a.nearest||a.point.name.localeCompare(b.point.name,'ko'));
 const maxLabels=window.innerWidth<701
  ?(scale<1.55?3:scale<3?6:10)
  :(selection.material==='combined'?(scale<1.55?3:scale<3?7:12)
   :(scale<1.55?7:scale<3?13:23));
 const clearance=scale<1.55?52:scale<3?38:28;
 const occupied=[];
 let labelCount=0;
 for(const item of candidates){
  if(labelCount>=maxLabels)break;
  if(item.nearest<clearance)continue;
  if(!withinView(item.screenX,item.screenY,23))continue;
  if(visibleClusterCenters.some(center=>Math.hypot(center.x-item.screenX,center.y-item.screenY)<35))continue;
  const name=item.point.name;
  // Approximate Pretendard's Korean glyph advances to avoid label collisions.
  const width=Math.min(132,Math.max(28,[...name].reduce((w,ch)=>w+(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/.test(ch)?9:5.5),0)+12));
  const rect={l:item.screenX-width/2,r:item.screenX+width/2,
   t:item.screenY-30,b:item.screenY-7};
  if(rect.l<view.left+9||rect.r>view.right-9||rect.t<view.top+8)continue;
  if(occupied.some(box=>!(rect.r+10<box.l||rect.l-10>box.r||rect.b+9<box.t||rect.t-9>box.b)))continue;
  const label=el('button','research-factory-label',name);
  label.type='button';
  label.dataset.material=item.point.material;
  label.style.left=item.left+'px';
  label.style.top=(item.top-8)+'px';
  label.style.transform='translate(-50%,-100%)';
  label.title=item.point.name+' · '+(item.point.region||materialLabels[item.point.material]);
  label.setAttribute('aria-label',item.point.name+' 업체 정보 보기');
  label.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   selectPoint(item.point);
  });
  fragment.append(label);
  occupied.push(rect);
  labelCount++;
 }
 wrap.replaceChildren(fragment);
}
function update(){
 const map=$('#research-map-art');
 const stack=map?.querySelector('.research-map-stack');
 if(!map||!stack)return;
 const old=map.querySelector(':scope > .research-factory-pins');
 if(old)old.remove();
 const layer=el('div','research-factory-pins');
 layer.setAttribute('aria-label','등록된 공장 위치');
 map.append(layer);
 const selection=activeSelection(),viewKey=selection.year+'-'+selection.material;
 if(state.viewKey!==viewKey){
  state.selected=null;
  panel.hidden=true;
  state.viewKey=viewKey;
 }
 const list=visiblePoints();
 for(const image of stack.querySelectorAll('.research-map-layer')){
  if(!image.complete)image.addEventListener('load',positionPins,{once:true});
 }
 requestAnimationFrame(positionPins);
 if(state.selected&&!list.some(p=>p.id===state.selected)){
  state.selected=null;panel.hidden=true;
 }else if(state.selected){
  const point=list.find(p=>p.id===state.selected);
  if(point)showPoint(point);
 }
}
function showPoint(point){
 panel.replaceChildren();
 const close=el('button','research-factory-close','×');
 close.type='button';close.setAttribute('aria-label','업체 정보 닫기');
 close.addEventListener('click',()=>{state.selected=null;panel.hidden=true;update()});
 const heading=el('h2','research-factory-name',point.name);
 const label=point.material==='tile'&&point.tileType?point.tileType:materialLabels[point.material]+'공장';
 const subtitle=el('p','research-factory-subtitle',point.year+'년 · '+label+(point.region?' · '+point.region:''));
 const top=el('div','research-factory-summary');
 top.append(heading,close);panel.append(top,subtitle);
 if(point.note)panel.append(el('p','research-factory-note',point.note));
 if(point.source)panel.append(el('p','research-factory-source','출처: '+point.source));
 panel.hidden=false;
}
function selectPoint(point){
 state.selected=point.id;
 showPoint(point);
 update();
}
function mapClick(event){
 if(event.target.closest('.research-factory-pin'))return true;
 // Printed factory symbols remain interactive for viewing registered makers.
 const nearby=visiblePoints().map(point=>{
  const image=findImage(point.material),bounds=image?.getBoundingClientRect();
  if(!bounds||!bounds.width||!bounds.height)return null;
  const px=bounds.left+point.x*bounds.width;
  const py=bounds.top+point.y*bounds.height;
  return {point,distance:Math.hypot(event.clientX-px,event.clientY-py)};
 }).filter(Boolean).filter(x=>x.distance<=(window.innerWidth<700?26:21));
 nearby.sort((a,b)=>a.distance-b.distance);
 if(nearby.length===1)selectPoint(nearby[0].point);
 else if(nearby.length>1)showCluster(nearby.map(x=>x.point));
 else{
  state.selected=null;
  panel.replaceChildren();
  panel.append(
   el('h2','research-factory-name','업체 정보 미등록'),
   el('p','research-factory-note','이 기호에 대응하는 업체 정보는 아직 등록되지 않았습니다.')
  );
  panel.hidden=false;
 }
 return true;
}
async function init({getSelection,selectMaterial,isAvailable}){
 if(state.initialized)return;
 state.initialized=true;
 Object.assign(context,{getSelection,selectMaterial,isAvailable});
 try{
  const response=await fetch('assets/research/factory-points.json',{cache:'no-cache'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const published=await response.json();
  state.points=Array.isArray(published.points)?published.points.map(cleanPoint).filter(Boolean):[];
 }catch(error){
  console.warn('공장 위치 자료를 불러올 수 없습니다:',error);
  state.points=[];
 }
 window.addEventListener('resize',()=>requestAnimationFrame(positionPins));
}
window.ResearchPoints={init,update,mapClick,reposition:positionPins,hasPoints:()=>state.points.length>0};
})();
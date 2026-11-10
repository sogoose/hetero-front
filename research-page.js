(() => {
'use strict';

/* RESEARCH
   All copy and image paths: assets/research/research-data.json
   Maps without an image use an explicitly marked schematic placeholder.
   Never represent placeholder points as measured historical factory locations. */
const $ = selector => document.querySelector(selector);
const windowEl=$('#research-window');
const rail=$('#research-rail');
const panels=[...document.querySelectorAll('.research-panel')];
const MAP_PAGE_INDEX=panels.findIndex(panel=>panel.classList.contains('research-panel-map'));
const prev=$('#research-prev'),next=$('#research-next'),counter=$('#research-counter');
const pageButtons=[...document.querySelectorAll('.research-page-link')];
const mapArt=$('#research-map-art'),mapControls=$('#research-map-controls');
const yearControls=$('#research-map-year-controls');
const detail=$('#research-detail'),detailImage=$('#research-detail-image');
const detailKicker=$('#research-detail-kicker'),detailTitle=$('#research-detail-title');
const detailDescription=$('#research-detail-description');
const chapter=$('#chapter-menu');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={page:0,map:0,year:1991,voice:0,data:null,regionTables:null,pointer:null,lastWheel:0};
const stageNames=['PRODUCTION','DISTRIBUTION','TESTIMONY'];
const mapZoom={scale:1,x:0,y:0,drag:null,suppressClick:false,positionPending:false};
const MAP_ZOOM_MAX=5;
function clampMapPan(){
 const rect=mapArt.getBoundingClientRect();
 const mx=Math.max(0,(mapZoom.scale-1)*rect.width*.5);
 const my=Math.max(0,(mapZoom.scale-1)*rect.height*.5);
 mapZoom.x=Math.max(-mx,Math.min(mx,mapZoom.x));
 mapZoom.y=Math.max(-my,Math.min(my,mapZoom.y));
}
function queueZoomPins(){
 if(mapZoom.positionPending)return;
 mapZoom.positionPending=true;
 requestAnimationFrame(()=>{
  mapZoom.positionPending=false;
  window.ResearchPoints?.reposition?.();
 });
}
function applyMapZoom(){
 const stack=mapArt.querySelector('.research-map-stack');
 if(!stack)return;
 stack.dataset.zoomScale=String(mapZoom.scale);
 // Resize the actual image/SVG layout rather than scaling a cached compositor
 // texture. In particular, the Illustrator SVG must be repainted at the
 // requested pixel size; a CSS scale() can blur it like a low-res PNG.
 const rect=mapArt.getBoundingClientRect();
 const width=rect.width*mapZoom.scale;
 const height=rect.height*mapZoom.scale;
 const left=(rect.width-width)*.5+mapZoom.x;
 const top=(rect.height-height)*.5+mapZoom.y;
 stack.style.setProperty('position','absolute','important');
 stack.style.setProperty('width',width+'px','important');
 stack.style.setProperty('height',height+'px','important');
 stack.style.setProperty('left',left+'px','important');
 stack.style.setProperty('top',top+'px','important');
 stack.style.setProperty('transform','none','important');
 stack.style.setProperty('transform-origin','top left','important');
 mapArt.classList.toggle('is-map-zoomed',mapZoom.scale>1.001);
 const reset=$('#research-map-reset');
 if(reset){
  reset.hidden=mapZoom.scale<=1.001;
  reset.textContent=Math.round(mapZoom.scale*100)+'% · 원래 크기';
 }
 queueZoomPins();
}
function resetMapZoom(){
 mapZoom.scale=1;mapZoom.x=0;mapZoom.y=0;mapZoom.drag=null;
 applyMapZoom();
}
function zoomMapAt(nextScale,localX,localY){
 const before=mapZoom.scale;
 const after=Math.max(1,Math.min(MAP_ZOOM_MAX,nextScale));
 if(Math.abs(after-before)<.0001)return;
 const rect=mapArt.getBoundingClientRect();
 const ax=localX-rect.width/2,ay=localY-rect.height/2;
 const factor=after/before;
 mapZoom.x=ax-(ax-mapZoom.x)*factor;
 mapZoom.y=ay-(ay-mapZoom.y)*factor;
 mapZoom.scale=after;
 if(after<=1.001){mapZoom.scale=1;mapZoom.x=0;mapZoom.y=0}
 clampMapPan();applyMapZoom();
}
function initializeMapZoom(){
 const reset=$('#research-map-reset');
 reset?.addEventListener('click',resetMapZoom);
 mapArt.addEventListener('wheel',event=>{
  if(state.page!==MAP_PAGE_INDEX||overlayIsOpen())return;
  event.preventDefault();
  event.stopPropagation(); // never turn pages while zooming the map
  const multiplier=event.deltaMode===1?16:event.deltaMode===2?mapArt.clientHeight:1;
  const delta=Math.max(-400,Math.min(400,event.deltaY*multiplier));
  const rect=mapArt.getBoundingClientRect();
  zoomMapAt(mapZoom.scale*Math.exp(-delta*.0016),event.clientX-rect.left,event.clientY-rect.top);
 },{passive:false});
 mapArt.addEventListener('pointerdown',event=>{
  if(mapZoom.scale<=1||event.button!==0||overlayIsOpen())return;
  if(event.target.closest('button,a,input'))return;
  mapZoom.drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
  mapArt.setPointerCapture(event.pointerId);
  event.stopPropagation();
 });
 mapArt.addEventListener('pointermove',event=>{
  const drag=mapZoom.drag;
  if(!drag||drag.id!==event.pointerId)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  drag.x=event.clientX;drag.y=event.clientY;
  if(Math.abs(dx)+Math.abs(dy)>1)drag.moved=true;
  mapZoom.x+=dx;mapZoom.y+=dy;
  clampMapPan();applyMapZoom();
  event.preventDefault();event.stopPropagation();
 });
 const endDrag=event=>{
  const drag=mapZoom.drag;
  if(!drag||drag.id!==event.pointerId)return;
  mapZoom.suppressClick=drag.moved;
  mapZoom.drag=null;
  if(mapArt.hasPointerCapture(event.pointerId))mapArt.releasePointerCapture(event.pointerId);
  event.stopPropagation();
 };
 mapArt.addEventListener('pointerup',endDrag);
 mapArt.addEventListener('pointercancel',endDrag);
 mapArt.addEventListener('click',event=>{
  if(!mapZoom.suppressClick)return;
  mapZoom.suppressClick=false;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 mapArt.addEventListener('dblclick',event=>{
  if(state.page!==MAP_PAGE_INDEX||overlayIsOpen())return;
  event.preventDefault();event.stopImmediatePropagation();resetMapZoom();
 },true);
}

const accents={all:'#747971',red:'#c06b67',blue:'#5e86bc',green:'#6b9d84'};

function el(tag,cls,content){
 const item=document.createElement(tag);
 if(cls)item.className=cls;
 if(content!==undefined&&content!==null)item.textContent=String(content);
 return item;
}
function setText(selector,value){
 const target=$(selector);
 if(target)target.textContent=String(value||'');
}
function setLines(selector,values){
 const target=$(selector);if(!target)return;
 target.replaceChildren();
 (Array.isArray(values)?values:[values]).forEach((value,i)=>{
  if(i)target.append(document.createElement('br'));
  target.append(document.createTextNode(String(value||'')));
 });
}
function imageOrFallback(src,alt,kind,afterFail){
 const wrap=el('div',kind||'research-preview');
 const hasSource=typeof src==='string'&&src.trim()!=='';
 if(!hasSource){
  if(afterFail)afterFail();
  return wrap;
 }
 const img=el('img');
 img.alt=alt||'';img.loading='lazy';img.decoding='async';
 img.addEventListener('error',()=>{
  img.remove();
  if(afterFail)afterFail();
 },{once:true});
 img.src=src;
 wrap.append(img);
 return wrap;
}
function smallPlaceholder(kind){
 const icons={
  merchant:'<path d="M24 44H116L110 58H29Z M31 58V111H109V58 M37 68H103 M43 68V111 M96 68V111 M55 83H85V111"/>',
  site:'<path d="M18 116V34H99V116 M18 48L99 30 M45 35V116 M72 35V116 M23 73H97 M22 92H95 M110 116V38 M103 45L117 31"/>',
  house:'<path d="M14 69L65 28L117 69V120H14Z M24 75H106 M34 75V101H50V75 M80 75H100V96H80Z M60 89H74V120"/>',
  factory:'<path d="M14 119V58L46 74V53L83 71V31H113V119Z M87 31V15H105V31 M24 91H42 M50 91H68 M76 91H96"/>',
  source:'<path d="M24 114L44 31H89L109 114 M44 31L66 11L89 31 M33 81H100 M47 57H84 M55 114V85H81V114"/>'
 };
 const path=icons[kind]||icons.house;
 const svg=el('div','research-technical-placeholder');
 svg.innerHTML='<svg viewBox="0 0 132 138" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="#696a64" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round" fill="none">'+path+'</g></svg>';
 return svg;
}
function schematicMap(tone){
 // Deliberately unmarked schematic: no fictional factory points.
 const hue=accents[tone]||accents.all;
 const wrap=el('div','research-map-fallback');
 const svg='<svg viewBox="0 0 480 620" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
 +'<g fill="none" stroke="#dddcd4" stroke-width=".7">'
 +'<path d="M20 75L100 81M362 45L437 102M44 515L116 491M372 530L442 540" opacity=".35"/>'
 +'</g>'
 +'<path d="M247 23L279 35L298 60L299 87L321 104L314 128L337 151L326 173L342 192L329 219L337 242L319 269L332 300L311 325L307 356L291 374L285 402L272 420L273 448L249 470L233 496L210 519L200 540L181 551L163 527L149 511L151 486L138 456L143 428L133 404L147 381L153 349L150 325L164 303L171 276L165 255L183 231L187 205L203 184L207 160L224 138L215 111L230 83L228 57Z" fill="#fafaf7" stroke="#c4c6c0" stroke-width="1.5"/>'
 +'<g fill="none" stroke="#dadbd5" stroke-width=".8">'
 +'<path d="M172 304L239 301L326 299M157 381L229 370L297 383M170 274L217 240L325 231M202 184L261 184L335 193M168 430L228 446L264 463M214 139L266 123L310 130"/>'
 +'<path d="M176 515L224 476L244 426M196 402L258 361L290 322M208 340L207 282L250 250M233 212L258 161L281 103"/>'
 +'</g>'
 +'<path d="M215 162Q245 135 291 171T292 275T235 367T212 439" fill="none" stroke="'+hue+'" stroke-opacity=".26" stroke-width="34" stroke-linecap="round"/>'
 +'<path d="M215 162Q245 135 291 171T292 275T235 367T212 439" fill="none" stroke="'+hue+'" stroke-opacity=".85" stroke-width="1.5" stroke-dasharray="4 6"/>'
 +'<g font-family="sans-serif" font-size="11" fill="#aaa9a2">'
 +'<text x="365" y="120">東 海</text><text x="39" y="274">黃 海</text><text x="130" y="585">濟 州</text>'
 +'</g>'
 +'<path d="M175 569L194 562L213 567L204 578L182 581Z" stroke="#d6d7d0" fill="#fafaf7"/>'
 +'</svg>';
 wrap.innerHTML=svg;
 wrap.append(el('span','research-map-placeholder-stamp','SCHEMATIC / REPLACE MAP SOURCE'));
 return wrap;
}

/* Actual transparent GIS layers, registered by year in research-data.json.
   A blank year (null) is unavailable rather than interpolated or invented. */
function mapAvailable(map,year){
 if(map.id==='combined')return state.data.maps.some(entry=>entry.id!=='combined'&&entry.images&&entry.images[String(year)]);
 return Boolean(map.images&&map.images[String(year)]);
}
function mapSources(map,year){
 if(!map)return [];
 if(map.id==='combined'){
  return state.data.maps.filter(entry=>entry.id!=='combined'&&mapAvailable(entry,year))
   .map(entry=>({id:entry.id,label:entry.label,image:entry.images[String(year)]}));
 }
 return mapAvailable(map,year)?[{id:map.id,label:map.label,image:map.images[String(year)]}]:[];
}
function layeredMap(base,layers,detailMode){
 const stack=el('div','research-map-stack'+(detailMode?' research-map-stack-detail':'')+(layers.length>1?' is-combined':''));
 const paths=[
  {image:base,type:'base'},
  ...(state.data?.mapVector?[{image:state.data.mapVector,type:'vector'}]:[]),
  ...layers.map(layer=>({...layer,type:'overlay'}))
 ];
 paths.forEach((path,i)=>{
  if(!path.image)return;
  const typeClass=path.type==='base'?'research-map-base':
   path.type==='vector'?'research-map-vector':'research-map-overlay research-map-overlay--'+(path.id||'unknown');
  const img=el('img','research-map-layer '+typeClass);
  img.src=path.image;
  img.alt=path.type==='base'?'대한민국 지도':path.type==='vector'?'':(path.label||'공장')+' 위치 레이어';
  img.loading='eager';img.decoding='async';img.draggable=false;
  if(path.type==='vector')img.style.zIndex='1';
  if(path.type==='overlay')img.style.zIndex=String(i+2);
  img.addEventListener('error',()=>{
   img.remove();
   if(!stack.querySelector('img')){
    stack.replaceChildren(el('span','research-map-load-error','지도 파일을 불러오지 못했습니다. 연구 자료의 이미지 경로를 확인해 주세요.'));
   }
  },{once:true});
  stack.append(img);
 });
 return stack;
}

/* Small typeset research tables, sourced from the supplied print layouts.
   Registry pins and the printed regional count can differ for records with
   no precisely placed symbol. */
function makeRegionTable(material){
 const dataset=state.regionTables?.materials;
 if(!dataset)return null;
 const activeYear=state.year;
 const years=state.regionTables.years||[1991,2026];
 const lookup=dataset[material];
 const sheet=el('div','research-region-sheet');
 const header=el('div','research-region-heading');
 header.append(el('span','research-region-caption','지역별 공장 분포'));
 header.append(el('strong','research-region-material',material==='combined'?'재료별 비교':(lookup?.label||'공장')+'공장'));
 sheet.append(header);
 const table=el('table','research-region-table');
 const thead=el('thead');
 const headingRow=el('tr');
 headingRow.append(el('th','','지역'));
 years.forEach(year=>{
  const cell=el('th','research-region-year'+(activeYear===year?' is-current':''),String(year));
  cell.scope='col';
  headingRow.append(cell);
 });
 thead.append(headingRow);table.append(thead);
 const tbody=el('tbody');
 const rows=material==='combined'
  ?['brick','tile','cast'].map(id=>[dataset[id].label,...dataset[id].totals])
  :lookup?.rows||[];
 rows.forEach(row=>{
  const tr=el('tr');
  row.forEach((value,col)=>{
   const cell=el(col===0?'th':'td',col>0&&years[col-1]===activeYear?'is-current':'',value===null?'—':String(value));
   if(col===0)cell.scope='row';
   tr.append(cell);
  });
  tbody.append(tr);
 });
 table.append(tbody);
 const tfoot=el('tfoot'),total=el('tr');
 const totalValues=material==='combined'
 ?['합계*',177,69]
 :['합계',...(lookup?.totals||[null,null])];
 totalValues.forEach((value,col)=>{
  const cell=el(col===0?'th':'td',col>0&&years[col-1]===activeYear?'is-current':'',value===null?'—':String(value));
  total.append(cell);
 });
 tfoot.append(total);table.append(tfoot);sheet.append(table);
 if(material==='tile'){
  sheet.append(el('p','research-region-breakdown','점토 / 시멘트 · 1991년 5 / 113 · 2026년 11 / 13'));
 }else if(material==='brick'){
  sheet.append(el('p','research-region-footnote','1991년 59곳 중 58곳 지도 연결'));
 }else if(material==='cast'){
  sheet.append(el('p','research-region-footnote','2026년 28곳 중 27곳 지도 연결'));
 }else{
  sheet.append(el('p','research-region-footnote','* 1991년 주물 자료 없음 · 자료별 집계 합산'));
 }
 return sheet;
}
function renderRegionTables(){
 const selected=state.data?.maps?.[state.map]?.id||'brick';
 const modal=$('#research-region-dialog-content');
 if(!modal)return;
 modal.replaceChildren();
 const sheet=makeRegionTable(selected);
 if(sheet)modal.append(sheet);
}

function setMap(index){
 const list=state.data&&state.data.maps;
 if(!Array.isArray(list)||!list.length)return;
 const candidate=((index%list.length)+list.length)%list.length;
 // Material takes precedence: choosing a category not mapped in 1991 (cast)
 // automatically shows its available year instead of disabling the category.
 if(!mapAvailable(list[candidate],state.year)){
  const other=state.data.mapYears.find(y=>mapAvailable(list[candidate],y));
  if(other)state.year=other;
 }
 state.map=mapAvailable(list[candidate],state.year)?candidate:0;
 const map=list[state.map],layers=mapSources(map,state.year);
 // One short annotation, only when a source is genuinely absent.
 const annotation=$('#research-map-annotation');
 if(annotation){
  annotation.textContent=state.year===1991&&map.id==='combined'
   ?'※ 1991년 주물공장 분포는 자료가 없어 포함되지 않았습니다.'
   :'';
 }
 mapArt.replaceChildren();
 mapArt.dataset.material=map.id;
 mapArt.dataset.year=String(state.year);
 mapArt.setAttribute('aria-label',state.year+'년 '+(map.label||map.id)+' 공장 분포 지도');
 mapArt.append(layeredMap(state.data.mapBase,layers,false));
 mapArt.classList.remove('is-zoomable');
 resetMapZoom();
 window.ResearchPoints?.update();
 // Buttons are displayed in material order (brick / cast / tile), which is
 // deliberately different from the JSON data order. Resolve by stable ID.
 [...mapControls.querySelectorAll('button')].forEach(btn=>{
  const buttonMap=list.find(item=>item.id===btn.dataset.material);
  if(!buttonMap)return;
  const active=buttonMap.id===map.id;
  const available=mapAvailable(buttonMap,state.year);
  const availableAnyYear=state.data.mapYears.some(y=>mapAvailable(buttonMap,y));
  btn.disabled=!availableAnyYear;
  btn.setAttribute('aria-pressed',String(active));
  const mark=btn.querySelector('.research-map-choice-mark');
  if(mark)mark.textContent=state.year===1991?'○':'＋';
  const label=buttonMap.label||buttonMap.id;
  const availableYear=state.data.mapYears.find(y=>mapAvailable(buttonMap,y));
  btn.title=available?state.year+'년 '+label+' 지도'
   :availableYear?label+' 지도는 '+availableYear+'년에만 있습니다.'
   :'자료 미등록 · '+label;
  btn.setAttribute('aria-label',btn.title);
 });
 [...yearControls.querySelectorAll('button')].forEach(btn=>{
  const active=Number(btn.dataset.year)===state.year;
  btn.setAttribute('aria-pressed',String(active));
  // A year with no source for the selected material should not show a false map.
  btn.disabled=!mapAvailable(map,Number(btn.dataset.year));
 });
 const showAll=$('#research-map-all');
 if(showAll)showAll.setAttribute('aria-pressed',String(map.id==='combined'));
 renderRegionTables();
}
function setYear(year){
 const allowed=state.data&&state.data.mapYears;
 if(!allowed||!allowed.includes(Number(year)))return;
 state.year=Number(year);
 setMap(state.map);
}
function renderMaps(data){
 setText('#research-map-kicker',data.introduction&&data.introduction.kicker||'02 / DISTRIBUTION');
 setText('#research-map-heading',(data.introduction&&data.introduction.title||['혼종 재료의 출처']).join(' '));
 const paragraphs=Array.isArray(data.introduction?.body)?data.introduction.body:[];
 const essay=$('#research-map-essay'),dialogEssay=$('#research-essay-dialog-content');
 if(essay&&dialogEssay){
  essay.replaceChildren();dialogEssay.replaceChildren();
  paragraphs.forEach(copy=>{
   essay.append(el('p','research-map-paragraph',copy));
   dialogEssay.append(el('p','research-map-paragraph',copy));
  });
 }
 const essayDialog=$('#research-essay-dialog');
 $('#research-essay-more')?.addEventListener('click',()=>essayDialog?.showModal());
 $('#research-essay-close')?.addEventListener('click',()=>essayDialog?.close());
 essayDialog?.addEventListener('click',event=>{if(event.target===essayDialog)essayDialog.close()});
 const regionDialog=$('#research-region-dialog');
 $('#research-region-mobile-button')?.addEventListener('click',()=>regionDialog?.showModal());
 $('#research-region-close')?.addEventListener('click',()=>regionDialog?.close());
 regionDialog?.addEventListener('click',event=>{if(event.target===regionDialog)regionDialog.close()});
 yearControls.replaceChildren();
 (data.mapYears||[]).forEach(year=>{
  const button=el('button','research-map-year-choice',String(year));
  button.type='button';button.dataset.year=String(year);
  button.setAttribute('aria-label',year+'년 공장 분포 지도 보기');
  button.addEventListener('click',()=>setYear(year));
  yearControls.append(button);
 });
 mapControls.replaceChildren();
 [...(data.maps||[])].sort((a,b)=>{
  const priority=['brick','cast','tile','combined'];
  return priority.indexOf(a.id)-priority.indexOf(b.id);
 }).forEach(map=>{
  const index=data.maps.indexOf(map);
  const button=el('button','research-map-choice');
  button.type='button';
  button.dataset.material=map.id;
  button.style.setProperty('--map-chip',accents[map.tone]||accents.all);
  if(map.id==='combined'){
   button.textContent='전체';
  }else{
   button.append(el('span','research-map-choice-mark','○'),el('span','research-map-choice-label',map.label+'공장'));
  }
  button.addEventListener('click',()=>setMap(index));
  mapControls.append(button);
 });
 const showAll=$('#research-map-all');
 if(showAll)showAll.addEventListener('click',()=>setMap(0));
 mapArt.addEventListener('click',event=>{
  if(window.ResearchPoints?.mapClick(event))return;
 });

 state.year=data.mapYears&&data.mapYears.includes(1991)?1991:data.mapYears[0];
 const brickIndex=data.maps.findIndex(item=>item.id==='brick');
 setMap(brickIndex>=0?brickIndex:0);
}
function openDetail(item){
 if(!item)return;
 detailKicker.textContent=item.kicker||'RESEARCH / ARCHIVE';
 detailTitle.textContent=item.title||item.label||'';
 detailDescription.textContent=item.description||item.detail||'';
 detailImage.replaceChildren();
 if(item.mapBase&&Array.isArray(item.mapLayers)){
  detailImage.append(layeredMap(item.mapBase,item.mapLayers,true));
 }else if(item.image){
  const box=imageOrFallback(item.image,item.alt,'research-detail-media',()=>detailImage.append(smallPlaceholder(item.id)));
  detailImage.append(box);
 }else{
  detailImage.append(smallPlaceholder(item.id));
 }
 detail.showModal();
}
function renderProduction(data){
 const proc=data.production||{};
 setText('#research-production-kicker',proc.kicker||'01 / PRODUCTION');
 setText('#research-production-title',proc.title||'혼종은 어디에서 왔을까?');
 const essay=$('#research-production-essay');
 const hotspots=$('#research-origin-hotspots');
 const selected=$('#research-origin-selected');
 const diagram=$('#research-origin-image');
 const highlight=$('#research-origin-highlight');
 const shape=$('#research-origin-highlight-shape');
 if(!essay||!hotspots||!selected||!diagram||!highlight||!shape)return;
 diagram.src=proc.diagram||'assets/research/hetero-origin-diagram.svg';
 diagram.alt=proc.diagramAlt||'형태와 재료의 두 길이 혼종 주택에 모이는 도식';
 essay.replaceChildren();
 (proc.body||[]).forEach(text=>essay.append(el('p','research-origin-paragraph',text)));
 hotspots.replaceChildren();
 const buttons=[];
 const stages=Array.isArray(proc.stages)?proc.stages:[];
 let selectedId=null,hoveredId=null,focusedId=null;
 let iconSource=null;
 const cachedShapes=new Map();
 let lastDrawn=null;
 const refreshHighlight=()=>{
  // Exact icon path groups from the original Illustrator SVG. The arrows,
  // stage labels, and all unrelated icons are completely absent from the
  // selected group, rather than approximated with rectangular crop regions.
  const activeId=hoveredId||focusedId||selectedId;
  if(!activeId||!iconSource){
   highlight.classList.remove('is-active');
   return;
  }
  if(lastDrawn!==activeId){
   let vector=cachedShapes.get(activeId);
   if(!vector){
    const source=iconSource.getElementById('origin-'+activeId);
    if(!source){highlight.classList.remove('is-active');return}
    vector=document.importNode(source,true);
    vector.removeAttribute('id');
    cachedShapes.set(activeId,vector);
   }
   shape.replaceChildren(vector);
   lastDrawn=activeId;
  }
  highlight.classList.add('is-active');
 };
 // A one-time source fetch keeps the original detailed vector linework,
 // without coloring any of the connector arrows or label glyphs.
 fetch('assets/research/origin-icon-paths.svg',{cache:'force-cache'})
  .then(response=>{if(!response.ok)throw new Error('Icon outlines HTTP '+response.status);return response.text()})
  .then(source=>{
   const parsed=new DOMParser().parseFromString(source,'image/svg+xml');
   if(parsed.querySelector('parsererror'))throw new Error('Icon SVG parse error');
   const sourceDefs=parsed.querySelector('svg > defs');
   if(!sourceDefs)throw new Error('Icon SVG styles not found');
   const sourceStyle=sourceDefs.querySelector('style');
   if(sourceStyle){
    const style=document.importNode(sourceStyle,true);
    style.id='research-origin-source-style';
    highlight.querySelector('defs')?.append(style);
   }
   iconSource=parsed;
   refreshHighlight();
  }).catch(error=>console.warn('아이콘 강조 경로 로딩 실패:',error));
 const showPrompt=()=>{
  selected.replaceChildren(el('p','research-origin-hint','도식의 아이콘을 선택하면 각 단계의 이야기가 나타납니다.'));
 };
 stages.forEach(stage=>{
  const region=stage.hotspot||{};
  const button=el('button','research-origin-hotspot');
  button.type='button';
  button.title=stage.label;
  button.dataset.originId=stage.id;
  button.setAttribute('aria-label',stage.label+' 설명 보기');
  button.setAttribute('aria-controls','research-origin-selected');
  button.setAttribute('aria-pressed','false');
  ['x','y','w','h'].forEach(key=>{
   const value=Number(region[key]);
   if(Number.isFinite(value))button.style.setProperty('--origin-'+key,value+'%');
  });
  button.addEventListener('pointerenter',()=>{
   hoveredId=stage.id;refreshHighlight();
  });
  button.addEventListener('pointerleave',()=>{
   if(hoveredId===stage.id)hoveredId=null;
   refreshHighlight();
  });
  button.addEventListener('focus',()=>{
   focusedId=stage.id;refreshHighlight();
  });
  button.addEventListener('blur',()=>{
   if(focusedId===stage.id)focusedId=null;
   refreshHighlight();
  });
  button.addEventListener('click',()=>{
   const toggleOff=selectedId===stage.id;
   selectedId=toggleOff?null:stage.id;
   buttons.forEach(other=>{
    other.classList.toggle('is-selected',other.dataset.originId===selectedId);
    other.setAttribute('aria-pressed',String(other.dataset.originId===selectedId));
   });
   refreshHighlight();
   if(toggleOff){
    showPrompt();
    window.ResearchOriginPhotos?.clear?.();
    return;
   }
   const meta=el('span','research-origin-selection-meta',stage.number+' / '+(stage.path||'경로'));
   const heading=el('h3','research-origin-selection-title',stage.label);
   const body=el('p','research-origin-selection-body',stage.description||'');
   selected.replaceChildren(meta,heading,body);
   window.ResearchOriginPhotos?.select?.(stage);
  });
  buttons.push(button);
  hotspots.append(button);
 });
 showPrompt();
 window.ResearchOriginPhotos?.clear?.();
 refreshHighlight();
}
function selectVoice(index){
 const cards=[...document.querySelectorAll('.research-voice')];
 const tabs=[...document.querySelectorAll('.research-voice-tab')];
 if(!cards.length)return;
 state.voice=Math.max(0,Math.min(index,cards.length-1));
 cards.forEach((card,i)=>{
  card.classList.toggle('is-selected',i===state.voice);
 });
 tabs.forEach((tab,i)=>{
  tab.setAttribute('aria-pressed',String(i===state.voice));
 });
}
function renderVoices(data){
 const group=data.testimonies||{};
 setText('#research-voices-kicker',group.kicker||'03 / TESTIMONY');
 setText('#research-voices-title',group.title||'');
 setText('#research-voices-lead',group.lead||'');
 const host=$('#research-voices'),tabs=$('#research-voice-tabs');
 host.replaceChildren();tabs.replaceChildren();
 (group.items||[]).forEach((item,index)=>{
  const article=el('article','research-voice');
  const figure=el('button','research-voice-figure');
  figure.type='button';figure.setAttribute('aria-label',item.material+' 자료 크게 보기');
  if(item.image){
   const box=imageOrFallback(item.image,item.alt,'research-voice-image',()=>figure.append(smallPlaceholder(item.id)));
   figure.append(box);
  }else figure.append(smallPlaceholder(item.id));
  figure.addEventListener('click',()=>openDetail({kicker:item.material+' / TESTIMONY',title:item.question,image:item.image,alt:item.alt,description:item.detail,id:item.id}));
  article.append(figure,el('span','research-voice-material',item.number+' / '+item.material));
  article.append(el('h3','research-voice-question',item.question));
  const quote=el('blockquote','research-voice-quote','“'+(item.quote||'')+'”');
  article.append(quote,el('span','research-voice-speaker',item.speaker||''));
  if(item.href){
   const a=el('a','research-voice-link','인터뷰 아카이브 보기');
   a.href=item.href;
   article.append(a);
  }
  host.append(article);
  const tab=el('button','research-voice-tab',item.material);
  tab.type='button';
  tab.addEventListener('click',()=>selectVoice(index));
  tabs.append(tab);
 });
 selectVoice(0);
}
function updatePage(){
 rail.style.transform='translate3d('+(-state.page*windowEl.clientWidth)+'px,0,0)';
 counter.textContent=String(state.page+1).padStart(2,'0')+' / 03';
 prev.disabled=state.page===0;
 next.disabled=state.page===panels.length-1;
 panels.forEach((panel,i)=>{
  if(i===state.page){panel.removeAttribute('inert');panel.setAttribute('aria-hidden','false')}
  else{panel.setAttribute('inert','');panel.setAttribute('aria-hidden','true')}
 });
 pageButtons.forEach((button,i)=>{
  const active=i===state.page;
  button.classList.toggle('is-active',active);
  if(active)button.setAttribute('aria-current','page');
  else button.removeAttribute('aria-current');
 });
}
function goTo(index){
 if(!Number.isFinite(index)||detail.open||chapter.open)return;
 state.page=Math.max(0,Math.min(index,panels.length-1));
 updatePage();
}
function overlayIsOpen(){return detail.open||chapter.open}
function initializeNavigation(){
 initializeMapZoom();
 prev.addEventListener('click',()=>goTo(state.page-1));
 next.addEventListener('click',()=>goTo(state.page+1));
 pageButtons.forEach(button=>button.addEventListener('click',()=>goTo(Number(button.dataset.page))));
 windowEl.addEventListener('pointerdown',event=>{
  if(event.button!==0||overlayIsOpen())return;
  if(event.target.closest('button,a,input,select'))return;
  state.pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 windowEl.addEventListener('pointerup',event=>{
  if(!state.pointer||event.pointerId!==state.pointer.id)return;
  const dx=event.clientX-state.pointer.x,dy=event.clientY-state.pointer.y;
  state.pointer=null;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)goTo(state.page+(dx<0?1:-1));
 });
 windowEl.addEventListener('pointercancel',()=>{state.pointer=null});
 windowEl.addEventListener('wheel',event=>{
  if(overlayIsOpen()||Math.abs(event.deltaX)+Math.abs(event.deltaY)<10)return;
  // Allow the production explanation and icon detail to scroll independently.
  // Turning the wheel over copy must never unexpectedly change research plates.
  if(event.target.closest('.research-origin-essay,.research-origin-selected'))return;
  event.preventDefault();
  const now=Date.now();
  if(now-state.lastWheel<760)return;
  state.lastWheel=now;
  const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
  goTo(state.page+(delta>0?1:-1));
 },{passive:false});
 window.addEventListener('resize',()=>{
  const oldTransition=rail.style.transition;
  rail.style.transition='none';
  updatePage();
  clampMapPan();
  applyMapZoom();
  requestAnimationFrame(()=>{rail.style.transition=oldTransition});
 });
 window.addEventListener('keydown',event=>{
  if(overlayIsOpen()||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='ArrowRight'||event.key==='PageDown'){
   event.preventDefault();goTo(state.page+1);
  }else if(event.key==='ArrowLeft'||event.key==='PageUp'){
   event.preventDefault();goTo(state.page-1);
  }else if(event.key==='Home'){event.preventDefault();goTo(0)}
  else if(event.key==='End'){event.preventDefault();goTo(panels.length-1)}
 });
 $('#chapter-open').addEventListener('click',()=>chapter.showModal());
 $('#chapter-close').addEventListener('click',()=>chapter.close());
 chapter.addEventListener('click',event=>{if(event.target===chapter)chapter.close()});
 $('#research-detail-close').addEventListener('click',()=>detail.close());
 detail.addEventListener('click',event=>{if(event.target===detail)detail.close()});
 updatePage();
}
async function start(){
 initializeNavigation();
 try{
  const response=await fetch('assets/research/research-data.json',{cache:'no-cache'});
  if(!response.ok)throw new Error('Data not found ('+response.status+')');
  const data=await response.json();
  if(!Array.isArray(data.maps)||!data.production||!data.testimonies)throw new Error('Invalid research data');
  state.data=data;
  try{
   const distribution=await fetch('assets/research/region-tables.json',{cache:'no-cache'});
   if(distribution.ok){
    const tables=await distribution.json();
    if(tables.materials&&tables.years)state.regionTables=tables;
   }
  }catch(error){console.warn('Region tables unavailable:',error)}
  if(window.ResearchPoints){
   await window.ResearchPoints.init({
    getSelection:()=>({year:state.year,material:data.maps[state.map]?.id||'brick'}),
    selectMaterial:(material,year)=>{
     state.year=Number(year);
     const i=data.maps.findIndex(m=>m.id===material);
     if(i>=0)setMap(i);
    },
    isAvailable:(material,year)=>{
     const map=data.maps.find(m=>m.id===material);
     return map?mapAvailable(map,Number(year)):false;
    }
   });
  }
  renderMaps(data);
  renderProduction(data);
  renderVoices(data);
 }catch(error){
  console.error('Unable to load Research archive:',error);
  setText('#research-map-description','자료를 불러올 수 없습니다. assets/research/research-data.json 파일을 확인해 주세요.');
  setText('#research-production-lead','자료 연결을 확인해 주세요.');
  setText('#research-voices-lead','자료 연결을 확인해 주세요.');
 }
}
start();
})();
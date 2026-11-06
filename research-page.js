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
const prev=$('#research-prev'),next=$('#research-next'),counter=$('#research-counter');
const pageButtons=[...document.querySelectorAll('.research-page-link')];
const mapArt=$('#research-map-art'),mapControls=$('#research-map-controls');
const yearControls=$('#research-map-year-controls');
const detail=$('#research-detail'),detailImage=$('#research-detail-image');
const detailKicker=$('#research-detail-kicker'),detailTitle=$('#research-detail-title');
const detailDescription=$('#research-detail-description');
const chapter=$('#chapter-menu');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={page:0,map:0,year:1991,voice:0,data:null,pointer:null,lastWheel:0};
const stageNames=['DISTRIBUTION','PRODUCTION','TESTIMONY'];
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
 const paths=[{image:base,type:'base'},...layers.map(layer=>({...layer,type:'overlay'}))];
 paths.forEach((path,i)=>{
  if(!path.image)return;
  const img=el('img','research-map-layer '+(path.type==='base'?'research-map-base':('research-map-overlay research-map-overlay--'+(path.id||'unknown'))));
  img.src=path.image;
  img.alt=path.type==='base'?'대한민국 지도':(path.label||'공장')+' 위치 레이어';
  img.loading='eager';img.decoding='async';img.draggable=false;
  if(path.type==='overlay')img.style.zIndex=String(i+1);
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
function setMap(index){
 const list=state.data&&state.data.maps;
 if(!Array.isArray(list)||!list.length)return;
 const candidate=((index%list.length)+list.length)%list.length;
 state.map=mapAvailable(list[candidate],state.year)?candidate:0;
 const map=list[state.map],layers=mapSources(map,state.year);
 const selectedNames=layers.map(layer=>layer.label).join(' · ');
 const partial=state.year===1991&&map.id==='combined'?' · 주물 자료 없음':'';
 setText('#research-map-year',state.year+' / FACTORY DISTRIBUTION');
 setText('#research-map-current-title',state.year+'년 '+(map.title||map.label));
 setText('#research-map-description',(map.notes&&map.notes[String(state.year)])||map.description||'');
 const summary=$('#research-map-note-extra');
 if(summary){
  summary.replaceChildren();
  const line=el('div','research-map-fact');
  line.append(
   el('span','research-map-fact-label','표시 자료'),
   el('span','research-map-fact-value',layers.map(layer=>layer.label).join(' · '))
  );
  summary.append(line);
 }
 setText('#research-map-caption','MAP ARCHIVE / 1991 — 2026');
 mapArt.replaceChildren();
 mapArt.append(layeredMap(state.data.mapBase,layers,false));
 mapArt.classList.toggle('is-zoomable',layers.length>0);
 [...mapControls.querySelectorAll('button')].forEach((btn,i)=>{
  const active=i===state.map;
  const available=mapAvailable(list[i],state.year);
  btn.disabled=!available;
  btn.setAttribute('aria-pressed',String(active));
  btn.title=available?state.year+'년 '+list[i].label+' 지도':'자료 미등록 · '+state.year+'년 '+list[i].label;
  btn.setAttribute('aria-label',available?state.year+'년 '+list[i].label:state.year+'년 '+list[i].label+' 지도 자료 없음');
 });
 [...yearControls.querySelectorAll('button')].forEach(btn=>{
  const active=Number(btn.dataset.year)===state.year;
  btn.setAttribute('aria-pressed',String(active));
 });
}
function setYear(year){
 const allowed=state.data&&state.data.mapYears;
 if(!allowed||!allowed.includes(Number(year)))return;
 state.year=Number(year);
 setMap(state.map);
}
function renderMaps(data){
 setText('#research-map-kicker',data.introduction&&data.introduction.kicker||'01 / DISTRIBUTION');
 setLines('#research-map-heading',data.introduction&&data.introduction.title||['혼종은 어디에서','왔을까?']);
 setText('#research-map-lead',data.introduction&&data.introduction.lead||'');
 yearControls.replaceChildren();
 (data.mapYears||[]).forEach(year=>{
  const button=el('button','research-map-year-choice',String(year));
  button.type='button';button.dataset.year=String(year);
  button.setAttribute('aria-label',year+'년 공장 분포 지도 보기');
  button.addEventListener('click',()=>setYear(year));
  yearControls.append(button);
 });
 mapControls.replaceChildren();
 (data.maps||[]).forEach((map,index)=>{
  const button=el('button','research-map-choice',map.label||map.id);
  button.type='button';
  button.style.setProperty('--map-chip',accents[map.tone]||accents.all);
  button.addEventListener('click',()=>setMap(index));
  mapControls.append(button);
 });
 mapArt.addEventListener('click',()=>{
  const map=data.maps[state.map];
  const layers=mapSources(map,state.year);
  if(!layers.length||!mapArt.classList.contains('is-zoomable'))return;
  openDetail({
   kicker:state.year+' / FACTORY DISTRIBUTION',
   title:state.year+'년 '+(map.title||map.label),
   mapBase:data.mapBase,mapLayers:layers,
   description:map.description+(state.year===1991&&map.id==='combined'?' 1991년 주물 지도는 업로드되지 않아 종합 분포에 포함하지 않았습니다.':'')
  });
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
 setText('#research-production-kicker',proc.kicker||'02 / PRODUCTION');
 setText('#research-production-title',proc.title||'');
 setText('#research-production-lead',proc.lead||'');
 setText('#research-production-footnote',proc.footnote||'');
 const host=$('#research-process');
 host.replaceChildren();
 (proc.stages||[]).forEach(stage=>{
  const button=el('button','research-process-item');
  button.type='button';
  button.setAttribute('aria-label',stage.label+' 상세 설명');
  const visual=el('span','research-process-visual');
  if(stage.image){
   const box=imageOrFallback(stage.image,stage.alt,'research-process-image',()=>visual.append(smallPlaceholder(stage.id)));
   visual.append(box);
  }else visual.append(smallPlaceholder(stage.id));
  button.append(visual,el('span','research-process-number',stage.number),el('span','research-process-name',stage.label),el('span','research-process-sub',stage.sub));
  button.addEventListener('click',()=>openDetail({kicker:stage.number+' / PRODUCTION',title:stage.label,image:stage.image,alt:stage.alt,description:stage.description,id:stage.id}));
  host.append(button);
 });
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
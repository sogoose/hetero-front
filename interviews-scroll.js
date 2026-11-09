(() => {
'use strict';
/* HETERO FRONT / INTERVIEWS.
   Data: assets/interviews/interviews-data.json (source: supplied six-page
   edited exhibition PDF). All chapter headings are deliberately omitted.
   CSS native multi-columns flow horizontally; only the transcript's own
   overflow width is measured and reserved in the shared page strip. */
const viewport=document.getElementById('interview-viewport');
const rail=document.getElementById('interview-rail');
const chapter=document.getElementById('chapter-menu');
const chapterOpen=document.getElementById('interview-chapter-open');
const chapterClose=document.getElementById('chapter-close');
const previous=document.getElementById('interview-previous');
const next=document.getElementById('interview-next');
const progress=document.getElementById('interview-progress');
const position=document.getElementById('interview-position');
const navButtons=[...document.querySelectorAll('#interview-section-nav button')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let data=null, groups=[],scrollFrame=0,resizeFrame=0,dragStart=null,liveIndex=0;
const $=(selector)=>document.querySelector(selector);

function make(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined&&text!==null)node.textContent=String(text);
 return node;
}
function setText(node,value){if(node)node.textContent=value??''}
function renderGroup(entry,number){
 const group=make('section','interview-group');
 group.id=entry.id;
 group.dataset.interviewId=entry.id;
 group.setAttribute('aria-label',entry.material+' — '+entry.company+' 인터뷰');

 const head=make('header','interview-group-head');
 const titleArea=make('div','interview-title-area');
 const material=make('h2','interview-group-material',entry.material);
 const company=make('p','interview-group-company',entry.company);
 const micro=make('div','interview-group-micro');
 micro.append(make('span','',entry.person),make('span','',entry.date));
 titleArea.append(material,company,micro);
 head.append(titleArea,make('span','interview-group-no',String(number+1).padStart(2,'0')+' / 03'));

 const body=make('div','interview-group-body');
 const profile=make('aside','interview-profile');
 const fig=make('figure','interview-image');
 if(entry.illustration){
  const img=make('img');
  img.src=entry.illustration;img.alt=entry.material+' 관련 아카이브 이미지';
  img.loading='lazy';img.decoding='async';
  fig.append(img);
 }
 profile.append(fig,make('span','interview-profile-label',entry.place));
 profile.append(make('p','interview-profile-date',entry.date.split(' ')[0]));
 profile.append(make('p','interview-profile-source','2026년 인터뷰 · 전시용 발췌·편집본'));

 const flow=make('div','interview-flow');
 flow.setAttribute('aria-label',entry.company+' 인터뷰 질문과 답변');
 (entry.turns||[]).forEach((turn,i)=>{
  const role=turn.role==='Q'?'is-question':'is-answer';
  const p=make('p','interview-turn '+role);
  if(turn.role==='Q')p.append(make('span','interview-question-mark','Q.'));
  if(turn.role==='A'&&(i===0||entry.turns[i-1].role==='A'))p.classList.add('is-opening');
  p.append(document.createTextNode(turn.text||''));
  flow.append(p);
 });
 body.append(profile,flow);
 group.append(head,body);
 rail.append(group);
 return {id:entry.id,group,profile,body,flow};
}
function measure(){
 if(!groups.length)return;
 const oldFraction=viewport.scrollWidth>viewport.clientWidth
  ?viewport.scrollLeft/(viewport.scrollWidth-viewport.clientWidth):0;
 const compact=matchMedia('(max-width:395px)').matches;
 const mobile=matchMedia('(max-width:700px)').matches;
 const columnWidth=compact?215:mobile?230:260;
 for(const item of groups){
  const flow=item.flow;
  // Flex item must not shrink to viewport width while measuring overflow.
  flow.style.flex='none';
  flow.style.width=columnWidth+'px';
  item.group.style.width='auto';
  // The browser lays out all text into native multi-column fragments.
  // scrollWidth includes the overflowing (horizontal) final column.
  const needed=Math.ceil(flow.scrollWidth);
  flow.style.width=Math.max(columnWidth,needed)+'px';
 }
 // Browser layout calculates each group's width from its measured columns.
 // Keep reading position approximately stable when rotating / resizing.
 const limit=Math.max(0,viewport.scrollWidth-viewport.clientWidth);
 viewport.scrollLeft=limit*oldFraction;
 updateProgress();
}
function maxScroll(){return Math.max(0,viewport.scrollWidth-viewport.clientWidth)}
function jumpTo(id,animated=true){
 const item=groups.find(g=>g.id===id);
 if(!item)return;
 viewport.scrollTo({
  left:Math.max(0,item.group.offsetLeft-rail.offsetLeft-14),
  behavior:animated&&!reduced.matches?'smooth':'instant'
 });
}
function step(direction){
 const distance=Math.max(250,viewport.clientWidth*.81);
 viewport.scrollTo({
  left:Math.max(0,Math.min(maxScroll(),viewport.scrollLeft+direction*distance)),
  behavior:reduced.matches?'instant':'smooth'
 });
}
function activeSection(){
 if(!groups.length)return 0;
 const pointer=viewport.scrollLeft+Math.min(viewport.clientWidth*.44,350);
 let result=0;
 for(let i=0;i<groups.length;i++){
  const start=groups[i].group.offsetLeft-rail.offsetLeft;
  if(start<=pointer)result=i;
 }
 return result;
}
function updateProgress(){
 scrollFrame=0;
 const limit=maxScroll();
 const fraction=limit?viewport.scrollLeft/limit:0;
 progress.value=String(Math.round(fraction*1000));
 previous.disabled=viewport.scrollLeft<3;
 next.disabled=viewport.scrollLeft>=limit-3;
 liveIndex=activeSection();
 position.textContent=String(liveIndex+1).padStart(2,'0')+' / 03';
 navButtons.forEach(btn=>{
  const current=btn.dataset.interviewId===groups[liveIndex]?.id;
  btn.classList.toggle('is-current',current);
  if(current)btn.setAttribute('aria-current','true');
  else btn.removeAttribute('aria-current');
 });
}
function scheduleProgress(){
 if(!scrollFrame)scrollFrame=requestAnimationFrame(updateProgress);
}
function render(payload){
 data=payload;
 rail.replaceChildren();
 groups=(payload.interviews||[]).map(renderGroup);
 requestAnimationFrame(()=>{
  measure();
  const target=decodeURIComponent(location.hash.replace('#',''));
  if(groups.some(g=>g.id===target))jumpTo(target,false);
  updateProgress();
  // Web fonts can change paragraph wrapping and therefore column count.
  document.fonts?.ready.then(()=>{
   const idx=activeSection();
   measure();
   if(viewport.scrollLeft<5)return;
   const item=groups[idx];
   if(item&&Math.abs(item.group.offsetLeft-rail.offsetLeft-viewport.scrollLeft)<25)jumpTo(item.id,false);
  });
 });
}
function bindControls(){
 previous.addEventListener('click',()=>step(-1));
 next.addEventListener('click',()=>step(1));
 navButtons.forEach(btn=>btn.addEventListener('click',()=>jumpTo(btn.dataset.interviewId)));
 progress.addEventListener('input',()=>{
  viewport.scrollLeft=maxScroll()*(Number(progress.value)/1000);
 });
 viewport.addEventListener('scroll',scheduleProgress,{passive:true});
 viewport.addEventListener('wheel',evt=>{
  // A mouse wheel continues the same horizontal printed page.
  // Trackpad horizontal input works natively.
  if(!chapter.open&&Math.abs(evt.deltaY)>Math.abs(evt.deltaX)&&evt.deltaY!==0){
   evt.preventDefault();
   const factor=evt.deltaMode===1?21:evt.deltaMode===2?viewport.clientWidth:1;
   viewport.scrollLeft+=evt.deltaY*factor;
  }
 },{passive:false});
 // Optional grab-to-scroll on empty space only. Paragraphs stay selectable.
 viewport.addEventListener('pointerdown',evt=>{
  if(evt.pointerType!=='mouse'||evt.button!==0)return;
  if(evt.target.closest('p,button,a,input,nav'))return;
  dragStart={x:evt.clientX,left:viewport.scrollLeft,id:evt.pointerId};
 });
 viewport.addEventListener('pointermove',evt=>{
  if(!dragStart||evt.pointerId!==dragStart.id)return;
  viewport.scrollLeft=dragStart.left+dragStart.x-evt.clientX;
 });
 window.addEventListener('pointerup',()=>{dragStart=null});
 window.addEventListener('pointercancel',()=>{dragStart=null});
 viewport.addEventListener('keydown',evt=>{
  if(chapter.open)return;
  if(evt.key==='ArrowRight'){evt.preventDefault();step(1)}
  else if(evt.key==='ArrowLeft'){evt.preventDefault();step(-1)}
  else if(evt.key==='Home'){evt.preventDefault();jumpTo(groups[0]?.id)}
  else if(evt.key==='End'){evt.preventDefault();jumpTo(groups[groups.length-1]?.id)}
 });
 window.addEventListener('resize',()=>{
  cancelAnimationFrame(resizeFrame);
  resizeFrame=requestAnimationFrame(measure);
 },{passive:true});
 chapterOpen.addEventListener('click',()=>chapter.showModal());
 chapterClose.addEventListener('click',()=>chapter.close());
 chapter.addEventListener('click',evt=>{if(evt.target===chapter)chapter.close()});
}
async function init(){
 bindControls();
 try{
  const response=await fetch('assets/interviews/interviews-data.json',{cache:'no-cache'});
  if(!response.ok)throw new Error('인터뷰 데이터 오류 '+response.status);
  const payload=await response.json();
  if(!Array.isArray(payload.interviews)||payload.interviews.length!==3)throw new Error('인터뷰 목록의 구조가 올바르지 않습니다.');
  render(payload);
 }catch(error){
  console.error('Interviews archive:',error);
  rail.replaceChildren(make('p','interview-loading','인터뷰를 불러오지 못했습니다. 인터뷰 데이터 파일을 확인해 주세요.'));
 }
}
init();
})();
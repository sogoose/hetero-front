(() => {
'use strict';

/* INTERVIEWS — vertical, single-column reading. Source:
   assets/interviews/interviews-data.json (edited exhibition PDF). */
const viewport=document.getElementById('interview-viewport');
const host=document.getElementById('interview-rail');
const previous=document.getElementById('interview-previous');
const next=document.getElementById('interview-next');
const progress=document.getElementById('interview-progress');
const position=document.getElementById('interview-position');
const nav=[...document.querySelectorAll('#interview-section-nav button')];
const chapter=document.getElementById('chapter-menu');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const sections=[];
let ticking=false;

function element(tag,className,text){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined&&text!==null)node.textContent=String(text);
 return node;
}
function renderInterview(record,index){
 const section=element('section','interview-group');
 section.id=record.id;
 section.dataset.interviewId=record.id;
 section.setAttribute('aria-label',record.material+' — '+record.company+' 인터뷰');

 const identity=element('div','interview-identity');
 const title=element('h2','interview-group-material',record.material);
 const company=element('p','interview-group-company',record.company);
 const meta=element('div','interview-group-micro');
 meta.append(element('span','',record.person),element('span','',record.date));
 const fig=element('figure','interview-image');
 if(record.illustration){
  const image=element('img');
  image.src=record.illustration;
  image.alt=record.material+' 관련 아카이브 이미지';
  image.loading='lazy';
  image.decoding='async';
  fig.append(image);
 }
 const place=element('p','interview-profile-label',record.place);
 const note=element('p','interview-profile-source','2026년 인터뷰 · 전시용 발췌·편집본');
 identity.append(title,company,meta,fig,place,note);

 const transcript=element('div','interview-flow');
 transcript.setAttribute('aria-label',record.company+' 인터뷰 질문과 답변');
 (record.turns||[]).forEach(turn=>{
  const isAnswer=turn.role==='A';
  const paragraph=element('p','interview-turn '+(isAnswer?'is-answer':'is-question'));
  paragraph.append(element('span','interview-turn-mark',isAnswer?'A.':'Q.'));
  paragraph.append(document.createTextNode(String(turn.text||'')));
  transcript.append(paragraph);
 });
 section.append(identity,transcript);
 host.append(section);
 sections.push(section);
}
function activeIndex(){
 if(!sections.length)return 0;
 const marker=viewport.scrollTop+Math.min(viewport.clientHeight*.31,220);
 let index=0;
 sections.forEach((section,i)=>{
  if(section.offsetTop<=marker)index=i;
 });
 return index;
}
function update(){
 ticking=false;
 const limit=Math.max(0,viewport.scrollHeight-viewport.clientHeight);
 const fraction=limit?viewport.scrollTop/limit:0;
 progress.value=String(Math.round(fraction*1000));
 const index=activeIndex();
 position.textContent=String(index+1).padStart(2,'0')+' / '+String(sections.length).padStart(2,'0');
 previous.disabled=index===0&&viewport.scrollTop<=5;
 next.disabled=index===sections.length-1;
 nav.forEach((btn,i)=>{
  const active=i===index;
  btn.classList.toggle('is-current',active);
  if(active)btn.setAttribute('aria-current','true');
  else btn.removeAttribute('aria-current');
 });
}
function scheduleUpdate(){
 if(!ticking){ticking=true;requestAnimationFrame(update)}
}
function jump(index,smooth=true){
 if(index<0||index>=sections.length)return;
 const target=sections[index].offsetTop;
 viewport.scrollTo({top:target,behavior:smooth&&!reduced.matches?'smooth':'instant'});
}
function go(direction){
 const current=activeIndex();
 const top=sections[current]?.offsetTop||0;
 // If partway through an interview, the left arrow returns to its beginning;
 // otherwise navigate to the previous interview.
 const index=direction<0&&viewport.scrollTop>top+70?current:current+direction;
 jump(Math.max(0,Math.min(sections.length-1,index)));
}
function bind(){
 previous.addEventListener('click',()=>go(-1));
 next.addEventListener('click',()=>go(1));
 nav.forEach((button,i)=>button.addEventListener('click',()=>jump(i)));
 progress.addEventListener('input',()=>{
  const max=Math.max(0,viewport.scrollHeight-viewport.clientHeight);
  viewport.scrollTop=max*(Number(progress.value)/1000);
 });
 viewport.addEventListener('scroll',scheduleUpdate,{passive:true});
 viewport.addEventListener('keydown',event=>{
  if(chapter.open)return;
  if(event.key==='ArrowDown'||event.key==='PageDown'){
   event.preventDefault();viewport.scrollBy({top:viewport.clientHeight*.73,behavior:reduced.matches?'instant':'smooth'});
  }else if(event.key==='ArrowUp'||event.key==='PageUp'){
   event.preventDefault();viewport.scrollBy({top:-viewport.clientHeight*.73,behavior:reduced.matches?'instant':'smooth'});
  }else if(event.key==='Home'){
   event.preventDefault();jump(0);
  }else if(event.key==='End'){
   event.preventDefault();jump(sections.length-1);
  }
 });
 window.addEventListener('resize',scheduleUpdate,{passive:true});
 document.getElementById('interview-chapter-open').addEventListener('click',()=>chapter.showModal());
 document.getElementById('chapter-close').addEventListener('click',()=>chapter.close());
 chapter.addEventListener('click',event=>{if(event.target===chapter)chapter.close()});
}
async function init(){
 bind();
 try{
  const response=await fetch('assets/interviews/interviews-data.json',{cache:'no-cache'});
  if(!response.ok)throw new Error('인터뷰 데이터 HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data.interviews)||data.interviews.length!==3)throw new Error('인터뷰 자료 구조 오류');
  host.replaceChildren();
  data.interviews.forEach(renderInterview);
  const hash=decodeURIComponent(location.hash.slice(1));
  const index=sections.findIndex(section=>section.id===hash);
  if(index>=0)jump(index,false);
  update();
  document.fonts?.ready.then(()=>update());
 }catch(error){
  console.error('인터뷰 불러오기 실패:',error);
  host.replaceChildren(element('p','interview-loading','인터뷰를 불러오지 못했습니다. 자료 파일을 확인해 주세요.'));
 }
}
init();
})();
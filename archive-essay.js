/* HETERO FRONT / Archive statement + essay reveal */
(() => {
 'use strict';
 const main=document.querySelector('.photo-main');
 const trigger=document.getElementById('archive-essay-trigger');
 const essay=document.getElementById('archive-essay');
 const closeButton=document.getElementById('archive-essay-close');
 const board=document.getElementById('photo-board');
 const footer=document.querySelector('.archive-taskbar');
 if(!main||!trigger||!essay||!closeButton||!board)return;

 let open=false,cleanupTimer=0;
 const scroll=essay.querySelector('.archive-essay-scroll');

 const paper=essay.querySelector('.archive-essay-paper');

 /* Preserve the original scatter positions. Each reading-mode transform is a
    temporary CSS variable; removing the mode returns every actual card home. */
 function positionReadingCards(){
  const cards=Array.from(board.querySelectorAll('.polaroid'));
  if(!cards.length||!paper)return;
  const vw=window.innerWidth,vh=window.innerHeight;
  const boardRect=board.getBoundingClientRect();
  const gutter=Math.max(0,(vw-paper.getBoundingClientRect().width)/2);
  const mobile=vw<=700;
  const selectedCount=Math.min(cards.length,mobile?4:gutter<190?8:gutter<295?10:12);
  const perSide=Math.ceil(selectedCount/2);
  const order=[];
  for(let index=0;index<selectedCount;index++){
   const candidate=Math.floor((index+.28)*cards.length/selectedCount);
   if(!order.includes(candidate))order.push(candidate);
  }
  const selected=new Set(order);
  const rotations=[-13,9,14,-8,-11,16,7,-15,11,-9,15,-6];
  cards.forEach((card,i)=>{
   if(!selected.has(i)){
    card.classList.remove('is-essay-visible');
    return;
   }
   const slot=order.indexOf(i),side=slot%2,rank=Math.floor(slot/2);
   const width=parseFloat(getComputedStyle(card).width)||card.offsetWidth||175;
   const height=width/.90;
   const scale=mobile
    ?Math.max(.27,Math.min(.43,(vw*.31)/width))
    :Math.max(.34,Math.min(.95,(gutter-30)/(width*1.2)))*(1+((rank%3)-1)*.045);
   const visibleWidth=width*scale;
   const margin=Math.max(5,Math.min(17,gutter*.065));
   const xFraction=rank%2===0?.43:.57;
   const idealCenter=gutter*xFraction;
   const center=Math.max(visibleWidth*.55+margin,Math.min(gutter-visibleWidth*.55-margin,idealCenter));
   const centerX=side===0?center:vw-center;
   let centerY;
   if(mobile){
    // On phones the article uses one column. Keep only four subdued cards at
    // top/bottom side edges so they never dominate the reading area.
    centerY=rank===0?116:Math.max(210,vh-150);
   }else{
    const upper=87,lower=Math.max(upper+80,vh-121);
    centerY=upper+(perSide===1?0:rank/(perSide-1))*(lower-upper);
   }
   const stagger=mobile?0:(side===0?-11:11)*(rank%2===0?1:-1);
   const left=centerX-width/2-boardRect.left;
   const top=centerY+stagger-height/2-boardRect.top;
   card.style.setProperty('--essay-x',left.toFixed(2)+'px');
   card.style.setProperty('--essay-y',top.toFixed(2)+'px');
   card.style.setProperty('--essay-r',rotations[slot%rotations.length]+'deg');
   card.style.setProperty('--essay-scale',scale.toFixed(3));
   card.style.setProperty('--essay-opacity',mobile?'.31':'.93');
   card.classList.add('is-essay-visible');
  });
 }


 function setReadingMode(next,{returnFocus=true}={}){
  if(next&&board.classList.contains('is-gallery'))return;
  if(open===next)return;
  open=next;
  if(cleanupTimer)window.clearTimeout(cleanupTimer);
  if(next)positionReadingCards();
  main.classList.toggle('is-reading',next);
  board.inert=next;
  if(!next){
   // The exiting cards need their temporary class only for the return transition.
   cleanupTimer=window.setTimeout(()=>{
    if(!open)board.querySelectorAll('.polaroid.is-essay-visible').forEach(card=>card.classList.remove('is-essay-visible'));
    cleanupTimer=0;
   },1020);
  }
  trigger.setAttribute('aria-expanded',String(next));
  trigger.setAttribute('aria-label',next?'글 접고 사진으로 돌아가기':'글 펼쳐 읽기');
  essay.setAttribute('aria-hidden',String(!next));
  essay.inert=!next;
  if(next){
   if(scroll)scroll.scrollTop=0;
   essay.focus({preventScroll:true});
  }else if(returnFocus){
   trigger.focus({preventScroll:true});
  }
 }
 trigger.addEventListener('click',()=>setReadingMode(!open));
 closeButton.addEventListener('click',()=>setReadingMode(false));
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&open){
   event.preventDefault();
   setReadingMode(false);
  }
 });
 window.addEventListener('resize',()=>{
  if(open)positionReadingCards();
 });
 if(footer){
  footer.addEventListener('click',event=>{
   if(open&&event.target.closest('button,a'))setReadingMode(false,{returnFocus:false});
  });
  footer.addEventListener('change',event=>{
   if(open&&event.target.closest('select'))setReadingMode(false,{returnFocus:false});
  });
 }
})();

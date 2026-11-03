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

 let open=false;
 const scroll=essay.querySelector('.archive-essay-scroll');

 function setReadingMode(next,{returnFocus=true}={}){
  if(next&&board.classList.contains('is-gallery'))return;
  if(open===next)return;
  open=next;
  main.classList.toggle('is-reading',next);
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
 if(footer){
  footer.addEventListener('click',event=>{
   if(open&&event.target.closest('button,a'))setReadingMode(false,{returnFocus:false});
  });
  footer.addEventListener('change',event=>{
   if(open&&event.target.closest('select'))setReadingMode(false,{returnFocus:false});
  });
 }
})();

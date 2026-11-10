(() => {
 'use strict';
 const house=document.getElementById('home-house');
 const hotspots=[...document.querySelectorAll('.home-hotspot')];
 // Refreshing the homepage selects one passer-by from each side of the building.
 // The pair is not stored or reshuffled while a user is reading the page.
 const people=[...document.querySelectorAll('.home-person-link')];
 const pickOne=side=>{
  const candidates=people.filter(person=>person.dataset.side===side);
  if(!candidates.length)return null;
  return candidates[Math.floor(Math.random()*candidates.length)];
 };
 const visiblePeople=new Set([pickOne('left'),pickOne('right')]);
 people.forEach(person=>{
  person.hidden=!visiblePeople.has(person);
  person.setAttribute('aria-hidden',String(person.hidden));
  if(person.hidden)person.tabIndex=-1;
  else person.removeAttribute('tabindex');
 });

 const dialog=document.getElementById('home-essay');
 const trigger=document.getElementById('home-essay-trigger');
 const close=document.getElementById('home-essay-close');
 function activate(zone){
  if(zone)house.dataset.active=zone;
  else house.removeAttribute('data-active');
 }
 hotspots.forEach(link=>{
  const zone=link.dataset.zone;
  link.addEventListener('pointerenter',()=>activate(zone));
  link.addEventListener('pointerleave',()=>{
   if(!link.matches(':focus-visible'))activate(null);
  });
  link.addEventListener('focus',()=>activate(zone));
  link.addEventListener('blur',()=>activate(null));
  link.addEventListener('touchstart',()=>activate(zone),{passive:true});
 });
 trigger?.addEventListener('click',()=>{
  dialog.showModal();
  document.body.classList.add('home-reading');
  close.focus({preventScroll:true});
 });
 close?.addEventListener('click',()=>dialog.close());
 dialog?.addEventListener('click',event=>{
  if(event.target===dialog)dialog.close();
 });
 dialog?.addEventListener('close',()=>{
  document.body.classList.remove('home-reading');
  trigger.focus({preventScroll:true});
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!dialog?.open)activate(null);
 });
})();
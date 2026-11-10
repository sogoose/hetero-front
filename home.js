(() => {
 'use strict';
 const house=document.getElementById('home-house');
 // Prefer self-hosted reference plates, but show the attributed source image
 // when a page is viewed before the binary assets are cached by GitHub Actions.
 document.querySelectorAll('.home-figure-art img[data-fallback-src]').forEach(img=>{
  img.addEventListener('error',()=>{
   if(img.dataset.fallbackUsed)return;
   img.dataset.fallbackUsed='1';
   img.src=img.dataset.fallbackSrc;
  },{once:true});
 });

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
})();
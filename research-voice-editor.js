/* HETERO FRONT / Makers' Stories — public, read-only archival renderer.
   Keeps the fixed mixed order, approved photographs, contrast icons and
   Supabase text updates; exposes no editor or mutation request. */
(() => {
 'use strict';
 const API='https://xjhwzhqiixbombbudlpl.supabase.co/rest/v1';
 const KEY='sb_publishable_5agi4GlOLYN8wc3q4NxFAw_90Y2BKjn';
 const STORAGE='https://xjhwzhqiixbombbudlpl.supabase.co/storage/v1';
 const BUCKET='hetero-voice-photos';
 const PHOTO_PATH=/^cards\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
 const ICONS={brick:'assets/interviews/icons/brick.svg',cast:'assets/interviews/icons/cast.svg',roof:'assets/interviews/icons/roof.svg',tile:'assets/interviews/icons/tile.svg',merchant:'assets/interviews/icons/gangbuk-roof-tile.svg'};
 const PHOTO_ICONS={brick:'assets/research/voice-icons/brick-photo.svg',cast:'assets/research/voice-icons/cast-photo.svg',roof:'assets/research/voice-icons/roof-photo.svg',tile:'assets/research/voice-icons/tile-photo.svg',merchant:'assets/research/voice-icons/gangbuk-roof-tile-photo.svg'};
 const board=document.querySelector('#research-witness-grid');
 const sources=document.querySelector('#research-witness-sources');
 const intro=document.querySelector('#research-voices-lead');
 let initialized=false;
 let rows=[];
 function element(tag,cls,value){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined&&value!==null)node.textContent=String(value);
  return node;
 }
 function material(credit){
  const v=String(credit||'');
  if(/청화요업|벽돌/.test(v))return 'brick';
  if(/정우금속|주물/.test(v))return 'cast';
  if(/고령기와|기와/.test(v))return 'roof';
  if(/타일|도자기/.test(v))return 'tile';
  if(/강북산업|건재상/.test(v))return 'merchant';
  return 'other';
 }
 function photoURL(path){
  return typeof path==='string'&&PHOTO_PATH.test(path)
   ?STORAGE+'/object/public/'+BUCKET+'/'+path:null;
 }
 function normalize(x){
  return {
   slot:Number(x.slot),quote:String(x.quote||''),
   credit:String(x.credit||''),tag:String(x.tag||''),
   background_image_path:PHOTO_PATH.test(x.background_image_path||'')?x.background_image_path:null
  };
 }
 // A deterministic shuffle, independent of DB ordering and page reload.
 function rank(slot){
  let v=(Number(slot)>>>0)^0x93e29a71;
  v=Math.imul(v^(v>>>16),0x85ebca6b);
  v=Math.imul(v^(v>>>13),0xc2b2ae35);
  return (v^(v>>>16))>>>0;
 }
 function draw(){
  if(!board)return;
  const fragment=document.createDocumentFragment();
  rows.slice().sort((a,b)=>rank(a.slot)-rank(b.slot)||a.slot-b.slot).forEach(item=>{
   const card=element('article','research-voice-tile');
   card.dataset.material=material(item.credit);
   const bg=photoURL(item.background_image_path);
   if(bg){
    card.classList.add('has-photo');
    const photo=element('span','research-voice-tile-photo');
    photo.style.backgroundImage='url("'+bg+'")';
    photo.setAttribute('aria-hidden','true');
    card.append(photo);
   }
   card.append(
    element('span','research-voice-tile-tag',item.tag||'기록'),
    element('span','research-voice-tile-quote',item.quote),
    element('span','research-voice-tile-credit',item.credit)
   );
   const iconSrc=ICONS[card.dataset.material];
   if(iconSrc){
    const icon=element('img','research-voice-tile-icon');
    icon.src=bg?(PHOTO_ICONS[card.dataset.material]||iconSrc):iconSrc;
    icon.alt='';icon.loading='lazy';icon.decoding='async';icon.setAttribute('aria-hidden','true');
    card.append(icon);
   }
   fragment.append(card);
  });
  board.replaceChildren(fragment);
  board.setAttribute('aria-label','제작자들의 이야기 '+rows.length+'개, 고정된 혼합 순서로 배치된 증언');
 }
 async function refresh(){
  try{
   const response=await fetch(API+'/hetero_research_voice_cells?select=slot,quote,credit,tag,background_image_path&order=slot.asc',{
    headers:{apikey:KEY},cache:'no-store'
   });
   if(!response.ok)throw Error('증언 불러오기: '+response.status);
   const data=await response.json();
   if(!Array.isArray(data))throw Error('증언 데이터 형식 오류');
   rows=data.map(normalize);
   draw();
  }catch(error){console.warn('기본 증언 자료를 유지합니다:',error)}
  try{
   const response=await fetch(API+'/hetero_research_voice_intro?select=body&id=eq.1',{
    headers:{apikey:KEY},cache:'no-store'
   });
   if(!response.ok)throw Error('소개 불러오기: '+response.status);
   const data=await response.json();
   if(data[0]?.body&&intro)intro.textContent=data[0].body;
  }catch(error){console.warn('기본 소개 본문을 유지합니다:',error)}
 }
 function init(config){
  if(initialized||!board)return;
  initialized=true;
  rows=(config.grid||[]).map(normalize);
  const link=document.querySelector('#research-witness-link');
  if(link){link.href=config.archiveLink||'interviews.html';link.textContent=config.archiveText||'인터뷰 전문에서 더 읽기'}
  if(sources){
   const fragment=document.createDocumentFragment();
   (config.sources||[]).forEach(item=>{
    const entry=element('div','research-witness-source-row');
    entry.append(element('span','research-witness-source-material',item.material),
     element('span','research-witness-source-name',item.name));
    fragment.append(entry);
   });
   sources.replaceChildren(fragment);
  }
  draw();
  refresh();
 }
 window.ResearchVoiceGrid={init,isOpen:()=>false};
})();

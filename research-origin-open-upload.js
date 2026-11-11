/* HETERO FRONT / Research origin diagram: archived reference photos, view-only.
   One public photo per step, kept in Supabase Storage. No client upload API. */
(() => {
 'use strict';
 const ENDPOINT='https://xjhwzhqiixbombbudlpl.supabase.co';
 const BUCKET='hetero-origin-photos';
 const IDS=new Set(['original','collection','mass','repetition','factory','supplier','builder','hybrid']);
 const image=document.querySelector('#research-origin-photo-image');
 const placeholder=document.querySelector('#research-origin-photo-placeholder');
 let current=null,request=0;
 function clear(){
  current=null;request++;
  if(image){image.removeAttribute('src');image.hidden=true;}
  if(placeholder){placeholder.textContent='';placeholder.hidden=true;}
 }
 function select(stage){
  if(!IDS.has(stage?.id)||!image)return;
  current=stage.id;
  const revision=++request;
  const url=ENDPOINT+'/storage/v1/object/public/'+BUCKET+'/origin/'+current+'.webp';
  image.hidden=true;
  const probe=new Image();
  probe.onload=()=>{
   if(revision!==request)return;
   image.src=url;
   image.alt=stage.label?stage.label+' 참고 이미지':current+' 단계의 참고 이미지';
   image.hidden=false;
  };
  probe.onerror=()=>{
   if(revision!==request)return;
   image.hidden=true;image.removeAttribute('src');
  };
  probe.src=url;
 }
 window.ResearchOriginPhotos={select,clear};
})();

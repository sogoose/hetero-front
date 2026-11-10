/* HETERO FRONT / RESEARCH — one public reference image per diagram step.
   Public viewing uses a fixed object path; uploads require a Supabase Auth
   session and the server's existing approved-editor allowlist (Storage RLS).
   There are no public anonymous upload or overwrite permissions. */
(() => {
 'use strict';
 const ENDPOINT='https://xjhwzhqiixbombbudlpl.supabase.co';
 const KEY='sb_publishable_5agi4GlOLYN8wc3q4NxFAw_90Y2BKjn';
 const BUCKET='hetero-origin-photos';
 const IDS=new Set(['original','collection','mass','repetition','factory','supplier','builder','hybrid']);
 const $=s=>document.querySelector(s);
 const image=$('#research-origin-photo-image');
 const placeholder=$('#research-origin-photo-placeholder');
 const footer=$('#research-origin-photo-footer');
 const label=$('#research-origin-photo-label');
 const action=$('#research-origin-photo-upload');
 const picker=$('#research-origin-photo-file');
 const status=$('#research-origin-photo-status');
 let current=null,loadingId=0,busy=false;
 function message(content,error=false){
  if(!status)return;
  status.textContent=content||'';
  status.classList.toggle('is-error',error);
 }
 function photoPath(id){return 'origin/'+id+'.webp'}
 function photoURL(id){return ENDPOINT+'/storage/v1/object/public/'+BUCKET+'/'+photoPath(id)+'?v='+Date.now()}
 function showPhoto(id){
  const seq=++loadingId;
  const url=photoURL(id);
  const probe=new Image();
  placeholder.textContent='이미지 확인 중…';
  placeholder.hidden=false;
  image.hidden=true;
  probe.onload=()=>{
   if(seq!==loadingId||id!==current)return;
   image.src=url;image.alt=id+' 단계의 참고 이미지';
   image.hidden=false;
   placeholder.hidden=true;
   action.textContent='이미지 교체';
  };
  probe.onerror=()=>{
   if(seq!==loadingId||id!==current)return;
   image.removeAttribute('src');image.hidden=true;
   placeholder.textContent='등록된 이미지가 없습니다.';
   placeholder.hidden=false;
   action.textContent='이미지 등록';
  };
  probe.src=url;
 }
 function clear(){
  current=null;
  ++loadingId;
  image.removeAttribute('src');
  image.hidden=true;
  placeholder.textContent='아이콘을 선택하면 해당 단계의 이미지가 나타납니다.';
  placeholder.hidden=false;
  footer.hidden=true;
  message('');
 }
 function select(stage){
  if(!IDS.has(stage?.id))return;
  current=stage.id;
  label.textContent=stage.label||'';
  footer.hidden=false;
  message('');
  showPhoto(current);
 }
 async function compress(file){
  if(!file||!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)){
   throw new Error('JPG, PNG, WebP 또는 AVIF 이미지가 필요합니다.');
  }
  if(file.size>20*1024*1024)throw new Error('원본 이미지 용량은 20MB 이하로 선택해 주세요.');
  const local=URL.createObjectURL(file);
  const picture=new Image();
  try{
   picture.src=local;
   await new Promise((resolve,reject)=>{
    picture.onload=resolve;
    picture.onerror=()=>reject(new Error('이미지를 읽을 수 없습니다.'));
   });
   async function encode(edge,quality){
    const factor=Math.min(1,edge/Math.max(picture.naturalWidth,picture.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(picture.naturalWidth*factor));
    canvas.height=Math.max(1,Math.round(picture.naturalHeight*factor));
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('브라우저에서 이미지 변환을 지원하지 않습니다.');
    ctx.drawImage(picture,0,0,canvas.width,canvas.height);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
     if(blob?.type==='image/webp')resolve(blob);
     else reject(new Error('WebP로 변환할 수 없습니다.'));
    },'image/webp',quality));
   }
   let blob=await encode(1800,.86);
   if(blob.size>2.8*1024*1024)blob=await encode(1450,.74);
   if(blob.size>2.8*1024*1024)blob=await encode(1100,.62);
   if(blob.size>2.8*1024*1024)throw new Error('압축 후에도 이미지 용량이 너무 큽니다.');
   return blob;
  }finally{URL.revokeObjectURL(local)}
 }
 function onUploadClick(){
  if(current&&!busy)picker.click();
 }
 async function uploadImage(){
  const file=picker.files?.[0];
  picker.value='';
  if(!file||!current||busy)return;
  const stage=current;
  busy=true;
  action.disabled=true;
  try{
   message('이미지를 정리하고 있어요…');
   const blob=await compress(file);
   message('이미지를 업로드하고 있어요…');
   const response=await fetch(ENDPOINT+'/storage/v1/object/'+BUCKET+'/'+photoPath(stage),{
    method:'POST',
    headers:{apikey:KEY,'Content-Type':'image/webp','x-upsert':'true','cache-control':'60'},
    body:blob
   });
   if(!response.ok){
    let errorMessage='HTTP '+response.status;
    try{const problem=await response.json();errorMessage=problem.message||problem.error||errorMessage}catch(e){}
    throw new Error(errorMessage);
   }
   if(current===stage){
    showPhoto(stage);
    message('이미지를 등록했어요. 다시 올리면 기존 한 장이 교체됩니다.');
   }
  }catch(error){message('업로드 실패: '+error.message,true)}
  finally{busy=false;action.disabled=false}
 }
 action?.addEventListener('click',onUploadClick);
 picker?.addEventListener('change',uploadImage);
 window.ResearchOriginPhotos={select,clear};
})();

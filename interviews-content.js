/* HETERO FRONT / INTERVIEWS — published content, read-only.
   Preserve previously uploaded photos, hidden-photo choices and transcript
   corrections without exposing any add, edit, delete or restore controls. */
(() => {
 'use strict';
 const ENDPOINT='https://xjhwzhqiixbombbudlpl.supabase.co';
 const PUBLIC_KEY='sb_publishable_5agi4GlOLYN8wc3q4NxFAw_90Y2BKjn';
 const BUCKET='hetero-interview-photos';
 const VALID_IDS=new Set(['goryeong','jungwoo','chunghwa','ceramics','gangbuk']);
 const LABELS={goryeong:'고령기와',jungwoo:'정우금속',chunghwa:'청화요업',ceramics:'대한도자기타일공업협동조합',gangbuk:'강북산업'};
 let mounted=false;

 function element(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  return node;
 }
 async function rows(path){
  const response=await fetch(ENDPOINT+path,{method:'GET',headers:{apikey:PUBLIC_KEY}});
  if(!response.ok)throw new Error('Read-only interview data HTTP '+response.status);
  return response.json();
 }
 function photoUrl(path){
  return ENDPOINT+'/storage/v1/object/public/'+BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/');
 }
 function renderPhoto(record){
  if(!VALID_IDS.has(record.interview_id)||!record.storage_path)return;
  const aside=document.getElementById(record.interview_id)?.querySelector('.interview-identity');
  if(!aside)return;
  let gallery=aside.querySelector('.interview-gallery');
  if(!gallery){
   gallery=element('div','interview-gallery');
   gallery.setAttribute('aria-label',LABELS[record.interview_id]+' 관련 사진');
   aside.append(gallery);
  }
  const figure=element('figure','interview-gallery-item interview-live-photo');
  const button=element('button','interview-gallery-open');
  button.type='button';
  button.setAttribute('aria-label','인터뷰 사진 확대');
  const img=element('img','interview-gallery-photo');
  img.src=photoUrl(record.storage_path);
  img.alt=record.alt||'인터뷰 사진';
  img.loading='lazy';
  img.decoding='async';
  button.append(img);
  button.addEventListener('click',()=>window.InterviewArchivePhoto?.openImage({
   src:img.src,alt:img.alt,caption:record.caption||''
  },LABELS[record.interview_id]));
  figure.append(button);
  if(record.caption)figure.append(element('figcaption','interview-gallery-caption',record.caption));
  gallery.append(figure);
 }
 async function loadPhotos(){
  const data=await rows('/rest/v1/hetero_interview_photos?select=id,interview_id,storage_path,alt,caption,sort_order,created_at&order=sort_order.asc,created_at.asc');
  if(Array.isArray(data))data.forEach(renderPhoto);
 }
 async function loadHiddenBasePhotos(){
  const data=await rows('/rest/v1/hetero_interview_hidden_base_photos?select=interview_id,image_path');
  if(!Array.isArray(data))return;
  const hidden=new Set(data.filter(r=>VALID_IDS.has(r.interview_id)).map(r=>JSON.stringify([r.interview_id,r.image_path])));
  document.querySelectorAll('.interview-base-photo').forEach(figure=>{
   figure.hidden=hidden.has(JSON.stringify([figure.dataset.baseInterview,figure.dataset.baseSrc]));
  });
 }
 async function loadTranscriptCorrections(){
  const data=await rows('/rest/v1/hetero_interview_turn_edits?select=interview_id,turn_index,content');
  if(!Array.isArray(data))return;
  data.forEach(record=>{
   if(!VALID_IDS.has(record.interview_id)||!Number.isInteger(record.turn_index)||typeof record.content!=='string')return;
   const paragraph=document.getElementById(record.interview_id)?.querySelectorAll('.interview-turn')[record.turn_index];
   if(!paragraph)return;
   const contentNode=[...paragraph.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
   if(contentNode)contentNode.textContent=record.content;
  });
 }
 function mount(){
  if(mounted)return;
  mounted=true;
  [loadPhotos,loadHiddenBasePhotos,loadTranscriptCorrections].forEach(load=>{
   load().catch(error=>console.warn('인터뷰 공개 자료 불러오기 실패:',error));
  });
 }
 window.InterviewArchiveContent={mount};
})();

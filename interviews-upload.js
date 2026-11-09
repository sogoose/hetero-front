/* HETERO FRONT / INTERVIEWS — temporary login-free photo upload.
   Public images live in a dedicated Supabase Storage bucket. Public metadata
   appears in the gallery. A server-side upload switch can revoke anon writes
   without requiring a GitHub deploy. No edit token or password is embedded. */
(() => {
'use strict';

const ENDPOINT='https://xjhwzhqiixbombbudlpl.supabase.co';
const PUBLIC_KEY='sb_publishable_5agi4GlOLYN8wc3q4NxFAw_90Y2BKjn';
const BUCKET='hetero-interview-photos';
const VALID_IDS=new Set(['goryeong','jungwoo','chunghwa']);
const LABELS={goryeong:'고령기와',jungwoo:'정우금속',chunghwa:'청화요업'};
const $=selector=>document.querySelector(selector);
const dlg=$('#interview-upload-dialog');
const form=$('#interview-upload-form');
const filePicker=$('#interview-upload-file');
const preview=$('#interview-upload-preview');
const status=$('#interview-upload-status');
const details=$('#interview-upload-size');
let enabled=false, mounted=false, submitting=false, current=null;
let previewUrl=null;
let prepared=null, preparing=false, pickVersion=0;
let editingPhoto=null;
let editingTurn=null;
let editBusy=false;
const originalTurns=new Map();
const editedTurns=new Map();
const hiddenBasePhotos=new Set();
const baseKey=(id,path)=>JSON.stringify([id,path]);
const keyFor=(id,index)=>id+':'+index;

function create(tag,className,text){
 const element=document.createElement(tag);
 if(className)element.className=className;
 if(text!==undefined)element.textContent=String(text);
 return element;
}
function notify(message,isError=false){
 status.textContent=message;
 status.classList.toggle('is-error',Boolean(isError));
}
async function api(path,{method='GET',body=null,headers={}}={}){
 const response=await fetch(ENDPOINT+path,{
  method,headers:{apikey:PUBLIC_KEY,...headers},body
 });
 const raw=await response.text();
 let data=null;
 try{data=raw?JSON.parse(raw):null}catch(e){data=raw}
 if(!response.ok){
  throw new Error(String(data?.message||data?.error||data?.msg||'요청 실패 (HTTP '+response.status+')'));
 }
 return data;
}
function objectUrl(path){
 return ENDPOINT+'/storage/v1/object/public/'+BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/');
}
function releasePreview(){
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}
 preview.removeAttribute('src');
 preview.hidden=true;
}
function updateControls(){
 document.querySelectorAll('.interview-add-photo,.interview-edit-text').forEach(button=>{
  button.hidden=!enabled;
 });
 document.querySelectorAll('.interview-live-actions,.interview-base-actions').forEach(actions=>{
  actions.hidden=!enabled;
 });
 document.querySelectorAll('.interview-base-restore-list').forEach(list=>{
  list.hidden=!enabled || list.childElementCount===0;
 });
 document.querySelectorAll('.interview-group').forEach(group=>{
  group.classList.toggle('has-public-edit',enabled);
  if(!enabled)group.classList.remove('is-editing-text');
 });
}
async function refreshEnabled(){
 try{
  const records=await api('/rest/v1/hetero_interview_upload_settings?select=uploads_enabled&id=eq.1');
  enabled=Array.isArray(records)&&records.length===1&&records[0].uploads_enabled===true;
 }catch(error){
  console.warn('인터뷰 업로드 상태 조회 실패:',error);
  enabled=false;
 }
 updateControls();
 return enabled;
}
function makeUploadButtons(){
 document.querySelectorAll('.interview-group').forEach(group=>{
  const id=group.dataset.interviewId;
  if(!VALID_IDS.has(id)||group.querySelector('.interview-add-photo'))return;
  const button=create('button','interview-add-photo','＋ 사진 추가');
  button.type='button';
  button.hidden=!enabled;
  button.setAttribute('aria-label',LABELS[id]+' 사진 추가');
  button.addEventListener('click',()=>open(id));
  group.querySelector('.interview-identity')?.append(button);
 });
}
async function open(id){
 if(!VALID_IDS.has(id)||!dlg||submitting)return;
 const permitted=await refreshEnabled();
 if(!permitted){window.alert('현재 사진 업로드가 종료되어 있습니다.');return}
 current=id;
 form.reset();
 prepared=null;preparing=false;pickVersion++;
 releasePreview();
 details.textContent='';
 notify('');
 $('#interview-upload-title').textContent=LABELS[id]+' 사진 추가';
 dlg.showModal();
}
function renderPhoto(record){
 if(!VALID_IDS.has(record.interview_id)||!record.id||!record.storage_path)return;
 const group=document.getElementById(record.interview_id);
 const aside=group?.querySelector('.interview-identity');
 if(!aside)return;
 let gallery=aside.querySelector('.interview-gallery');
 if(!gallery){
  gallery=create('div','interview-gallery');
  gallery.setAttribute('aria-label',LABELS[record.interview_id]+' 관련 사진');
  const button=aside.querySelector('.interview-add-photo');
  if(button)aside.insertBefore(gallery,button);
  else aside.append(gallery);
 }
 const figure=create('figure','interview-gallery-item interview-live-photo');
 figure.dataset.liveId=record.id;
 const image=create('img','interview-gallery-photo');
 image.src=objectUrl(record.storage_path);
 image.alt=record.alt||'인터뷰 사진';
 image.loading='lazy';image.decoding='async';
 const trigger=create('button','interview-gallery-open');
 trigger.type='button';trigger.setAttribute('aria-label','인터뷰 사진 확대');
 trigger.append(image);
 trigger.addEventListener('click',()=>window.InterviewArchivePhoto?.openImage({
  src:image.src,alt:image.alt,caption:record.caption||''
 },LABELS[record.interview_id]));
 figure.append(trigger);
 if(record.caption)figure.append(create('figcaption','interview-gallery-caption',record.caption));
 const actions=create('div','interview-live-actions');
 actions.hidden=!enabled;
 const edit=create('button','interview-live-action','설명 수정');
 edit.type='button';
 edit.addEventListener('click',()=>openPhotoEdit(record));
 const remove=create('button','interview-live-action interview-live-delete','삭제');
 remove.type='button';
 remove.addEventListener('click',()=>deletePhoto(record));
 actions.append(edit,remove);
 figure.append(actions);
 gallery.append(figure);
}
async function refresh(){
 try{
  const records=await api('/rest/v1/hetero_interview_photos?select=id,interview_id,storage_path,alt,caption,sort_order,created_at&order=sort_order.asc,created_at.asc');
  document.querySelectorAll('.interview-live-photo').forEach(node=>node.remove());
  if(Array.isArray(records))records.forEach(renderPhoto);
 }catch(error){console.warn('인터뷰 사진 목록을 불러오지 못했습니다:',error)}
}


/* Git-based photos are immutable from a public static page. Persist a
   server-side hide overlay instead of exposing GitHub credentials or deleting
   source files. An original can be restored while public editing is open. */
function installBasePhotoControls(){
 document.querySelectorAll('.interview-base-photo').forEach(figure=>{
  const id=figure.dataset.baseInterview;
  const src=figure.dataset.baseSrc;
  if(!VALID_IDS.has(id)||!src?.startsWith('assets/')||figure.querySelector('.interview-base-actions'))return;
  const actions=create('div','interview-base-actions interview-live-actions');
  actions.hidden=!enabled;
  const remove=create('button','interview-live-action interview-base-remove','삭제');
  remove.type='button';
  remove.setAttribute('aria-label','기본 사진을 사이트에서 삭제');
  remove.addEventListener('click',()=>hideBasePhoto(id,src));
  actions.append(remove);
  figure.append(actions);
 });
 document.querySelectorAll('.interview-group').forEach(group=>{
  const aside=group.querySelector('.interview-identity');
  if(!aside||aside.querySelector('.interview-base-restore-list'))return;
  const list=create('div','interview-base-restore-list');
  list.hidden=true;
  const uploadButton=aside.querySelector('.interview-add-photo');
  if(uploadButton)aside.insertBefore(list,uploadButton);
  else aside.append(list);
 });
}
function updateBasePhotoVisibility(){
 document.querySelectorAll('.interview-base-photo').forEach(figure=>{
  const key=baseKey(figure.dataset.baseInterview,figure.dataset.baseSrc);
  figure.hidden=hiddenBasePhotos.has(key);
 });
 document.querySelectorAll('.interview-group').forEach(group=>{
  const aside=group.querySelector('.interview-identity');
  const list=aside?.querySelector('.interview-base-restore-list');
  if(!list)return;
  list.replaceChildren();
  group.querySelectorAll('.interview-base-photo').forEach(figure=>{
   const id=figure.dataset.baseInterview,src=figure.dataset.baseSrc;
   if(!hiddenBasePhotos.has(baseKey(id,src)))return;
   const button=create('button','interview-base-restore','기본 사진 복원');
   button.type='button';
   button.setAttribute('aria-label',LABELS[id]+' 숨긴 기본 사진 복원');
   button.title=src;
   button.addEventListener('click',()=>restoreBasePhoto(id,src));
   list.append(button);
  });
  list.hidden=!enabled||list.childElementCount===0;
 });
}
async function refreshHiddenBase(){
 try{
  const rows=await api('/rest/v1/hetero_interview_hidden_base_photos?select=interview_id,image_path');
  if(!Array.isArray(rows))return;
  hiddenBasePhotos.clear();
  rows.forEach(row=>{
   if(VALID_IDS.has(row.interview_id)&&typeof row.image_path==='string'){
    hiddenBasePhotos.add(baseKey(row.interview_id,row.image_path));
   }
  });
  updateBasePhotoVisibility();
 }catch(error){
  console.warn('기본 사진 숨김 상태를 불러오지 못했습니다:',error);
 }
}
async function hideBasePhoto(id,src){
 if(!VALID_IDS.has(id)||!src?.startsWith('assets/')||editBusy)return;
 if(!window.confirm('이 기본 사진을 사이트에서 삭제할까요?\nGitHub 원본은 남고, 나중에 복원할 수 있어요.'))return;
 editBusy=true;
 try{
  await canEditNow();
  await api('/rest/v1/hetero_interview_hidden_base_photos',{
   method:'POST',
   headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
   body:JSON.stringify({interview_id:id,image_path:src})
  });
  hiddenBasePhotos.add(baseKey(id,src));
  updateBasePhotoVisibility();
 }catch(error){
  window.alert('기본 사진 삭제 실패: '+error.message);
 }finally{editBusy=false}
}
async function restoreBasePhoto(id,src){
 if(!VALID_IDS.has(id)||!src?.startsWith('assets/')||editBusy)return;
 editBusy=true;
 try{
  await canEditNow();
  await api('/rest/v1/hetero_interview_hidden_base_photos?interview_id=eq.'+
   encodeURIComponent(id)+'&image_path=eq.'+encodeURIComponent(src),{
   method:'DELETE',headers:{'Prefer':'return=minimal'}
  });
  hiddenBasePhotos.delete(baseKey(id,src));
  updateBasePhotoVisibility();
 }catch(error){
  window.alert('기본 사진 복원 실패: '+error.message);
 }finally{editBusy=false}
}

/* Temporary on-page photo caption edits and deletion.
   Edits are limited by Supabase RLS to the currently open public-edit period. */
function photoDialog(){return $('#interview-photo-edit-dialog')}
function photoMessage(message,error=false){
 const target=$('#interview-photo-edit-status');
 target.textContent=message;
 target.classList.toggle('is-error',error);
}
async function canEditNow(){
 if(!(await refreshEnabled()))throw new Error('현재 편집 기능이 종료되어 있습니다.');
}
async function openPhotoEdit(record){
 try{
  await canEditNow();
  editingPhoto=record;
  $('#interview-photo-edit-alt').value=record.alt||'인터뷰 사진';
  $('#interview-photo-edit-caption').value=record.caption||'';
  photoMessage('');
  photoDialog().showModal();
 }catch(error){window.alert(error.message)}
}
async function savePhotoText(event){
 event.preventDefault();
 if(editBusy||!editingPhoto)return;
 editBusy=true;
 const button=$('#interview-photo-edit-form [type=submit]');
 button.disabled=true;photoMessage('저장하고 있어요…');
 try{
  await canEditNow();
  const alt=$('#interview-photo-edit-alt').value.trim().slice(0,180);
  const caption=$('#interview-photo-edit-caption').value.trim().slice(0,300);
  if(!alt)throw new Error('사진 설명을 입력해주세요.');
  await api('/rest/v1/hetero_interview_photos?id=eq.'+encodeURIComponent(editingPhoto.id),{
   method:'PATCH',
   headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
   body:JSON.stringify({alt,caption})
  });
  await refresh();
  photoDialog().close();
 }catch(error){photoMessage('수정 실패: '+error.message,true)}
 finally{editBusy=false;button.disabled=false}
}
async function deletePhoto(record){
 if(editBusy)return;
 if(!window.confirm('이 사진을 삭제할까요?\n삭제하면 다시 되돌릴 수 없습니다.'))return;
 editBusy=true;
 try{
  await canEditNow();
  // Database record first: avoid a broken image on the public page if a
  // storage deletion request fails. Only Supabase-origin photos are editable.
  await api('/rest/v1/hetero_interview_photos?id=eq.'+encodeURIComponent(record.id),{
   method:'DELETE',
   headers:{'Prefer':'return=minimal'}
  });
  let cleanupFailed=false;
  try{
   await api('/storage/v1/object/'+BUCKET,{
    method:'DELETE',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({prefixes:[record.storage_path]})
   });
  }catch(error){cleanupFailed=true;console.warn('사진 파일 정리 실패:',error)}
  await refresh();
  if(photoDialog()?.open)photoDialog().close();
  if(cleanupFailed)window.alert('사진은 페이지에서 삭제됐어요. 저장소 파일 정리는 실패해서 관리자가 확인해야 합니다.');
 }catch(error){
  window.alert('사진 삭제 실패: '+error.message);
 }finally{editBusy=false}
}

/* Transcript editing is a separate overlay on top of the original GitHub
   interview JSON. Nothing rewrites or destroys the published source. */
function textNodeFor(paragraph){
 return [...paragraph.childNodes].find(n=>n.nodeType===Node.TEXT_NODE)||null;
}
function paragraphFor(id,index){
 const section=document.getElementById(id);
 return section?.querySelectorAll('.interview-turn')[index]||null;
}
function updateTranscriptParagraph(id,index,text){
 const paragraph=paragraphFor(id,index);
 const node=paragraph?textNodeFor(paragraph):null;
 if(node)node.textContent=text;
 paragraph?.classList.toggle('has-archive-edit',editedTurns.has(keyFor(id,index)));
}
async function loadTranscriptEdits(){
 const base=await fetch('assets/interviews/interviews-data.json',{cache:'no-cache'});
 if(!base.ok)throw new Error('인터뷰 원문을 불러오지 못했습니다.');
 const data=await base.json();
 (data.interviews||[]).forEach(entry=>{
  (entry.turns||[]).forEach((turn,index)=>{
   originalTurns.set(keyFor(entry.id,index),String(turn.text||''));
  });
 });
 const rows=await api('/rest/v1/hetero_interview_turn_edits?select=interview_id,turn_index,content');
 if(!Array.isArray(rows))return;
 editedTurns.clear();
 rows.forEach(record=>{
  const key=keyFor(record.interview_id,record.turn_index);
  if(!originalTurns.has(key))return;
  editedTurns.set(key,String(record.content));
  updateTranscriptParagraph(record.interview_id,record.turn_index,String(record.content));
 });
}
function makeTextEditButtons(){
 document.querySelectorAll('.interview-group').forEach(group=>{
  const id=group.dataset.interviewId;
  if(!VALID_IDS.has(id))return;
  const sidebar=group.querySelector('.interview-identity');
  if(!sidebar||sidebar.querySelector('.interview-edit-text'))return;
  const button=create('button','interview-edit-text','본문 수정');
  button.type='button';button.hidden=!enabled;
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',async()=>{
   try{
    await canEditNow();
    const on=group.classList.toggle('is-editing-text');
    button.textContent=on?'수정 종료':'본문 수정';
    button.setAttribute('aria-pressed',String(on));
   }catch(error){window.alert(error.message)}
  });
  const head=sidebar.querySelector('.interview-identity-head');
  if(head)head.insertAdjacentElement('afterend',button);
  else sidebar.prepend(button);
  group.querySelectorAll('.interview-turn').forEach((paragraph,index)=>{
   paragraph.dataset.turnIndex=String(index);
   const change=create('button','interview-edit-turn','수정');
   change.type='button';change.setAttribute('aria-label',(index+1)+'번째 문장 수정');
   change.addEventListener('click',()=>openTurnEdit(id,index));
   paragraph.append(change);
  });
 });
}
function turnMessage(message,error=false){
 const target=$('#interview-turn-edit-status');
 target.textContent=message;
 target.classList.toggle('is-error',Boolean(error));
}
function turnDialog(){return $('#interview-turn-edit-dialog')}
async function openTurnEdit(id,index){
 try{
  await canEditNow();
  const key=keyFor(id,index);
  const original=originalTurns.get(key);
  if(original===undefined)throw new Error('인터뷰 원문을 확인할 수 없습니다.');
  editingTurn={id,index};
  $('#interview-turn-edit-content').value=editedTurns.get(key)??original;
  const paragraph=paragraphFor(id,index);
  $('#interview-turn-edit-context').textContent=LABELS[id]+' · '+(paragraph?.classList.contains('is-question')?'질문':'답변')+' '+(index+1);
  $('#interview-turn-restore').hidden=!editedTurns.has(key);
  turnMessage('');
  turnDialog().showModal();
 }catch(error){window.alert(error.message)}
}
async function saveTurnText(event){
 event.preventDefault();
 if(editBusy||!editingTurn)return;
 editBusy=true;
 const button=$('#interview-turn-edit-form [type=submit]');
 button.disabled=true;turnMessage('저장하고 있어요…');
 try{
  await canEditNow();
  const {id,index}=editingTurn;
  const content=$('#interview-turn-edit-content').value.trim();
  if(!content||content.length>4500)throw new Error('본문은 1~4500자로 입력해주세요.');
  const key=keyFor(id,index);
  const target='/rest/v1/hetero_interview_turn_edits';
  if(editedTurns.has(key)){
   await api(target+'?interview_id=eq.'+id+'&turn_index=eq.'+index,{
    method:'PATCH',
    headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
    body:JSON.stringify({content,edited_at:new Date().toISOString()})
   });
  }else{
   await api(target,{
    method:'POST',
    headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
    body:JSON.stringify({interview_id:id,turn_index:index,content})
   });
  }
  editedTurns.set(key,content);
  updateTranscriptParagraph(id,index,content);
  turnDialog().close();
 }catch(error){turnMessage('저장 실패: '+error.message,true)}
 finally{editBusy=false;button.disabled=false}
}
async function restoreTurn(){
 if(editBusy||!editingTurn)return;
 editBusy=true;
 const button=$('#interview-turn-restore');
 button.disabled=true;turnMessage('원문을 복원하고 있어요…');
 try{
  await canEditNow();
  const {id,index}=editingTurn;
  const key=keyFor(id,index),original=originalTurns.get(key);
  if(original===undefined)throw new Error('원문을 찾을 수 없습니다.');
  if(editedTurns.has(key)){
   await api('/rest/v1/hetero_interview_turn_edits?interview_id=eq.'+id+'&turn_index=eq.'+index,{
    method:'DELETE',
    headers:{'Prefer':'return=minimal'}
   });
  }
  editedTurns.delete(key);
  updateTranscriptParagraph(id,index,original);
  turnDialog().close();
 }catch(error){turnMessage('복원 실패: '+error.message,true)}
 finally{editBusy=false;button.disabled=false}
}
function bindContentEditors(){
 $('#interview-photo-edit-form').addEventListener('submit',savePhotoText);
 $('#interview-photo-edit-close').addEventListener('click',()=>{if(!editBusy)photoDialog().close()});
 $('#interview-photo-delete').addEventListener('click',()=>{
  if(editingPhoto){const photo=editingPhoto;photoDialog().close();deletePhoto(photo)}
 });
 photoDialog().addEventListener('cancel',event=>{if(editBusy)event.preventDefault()});
 $('#interview-turn-edit-form').addEventListener('submit',saveTurnText);
 $('#interview-turn-edit-close').addEventListener('click',()=>{if(!editBusy)turnDialog().close()});
 $('#interview-turn-restore').addEventListener('click',restoreTurn);
 turnDialog().addEventListener('cancel',event=>{if(editBusy)event.preventDefault()});
}

async function normalize(file){
 if(!file||!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)){
  throw new Error('JPG, PNG, WebP 또는 AVIF 사진을 선택해주세요.');
 }
 if(file.size>18*1024*1024)throw new Error('원본 사진은 18MB 이하만 업로드할 수 있어요.');
 const link=URL.createObjectURL(file);
 const img=new Image();
 try{
  img.src=link;
  await new Promise((resolve,reject)=>{
   img.onload=resolve;
   img.onerror=()=>reject(new Error('이미지를 읽을 수 없습니다.'));
  });
  async function optimize(maxSide,quality){
   const ratio=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
   const context=canvas.getContext('2d');
   if(!context)throw new Error('이미지 변환을 지원하지 않는 브라우저입니다.');
   context.drawImage(img,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
   if(!blob||blob.type!=='image/webp')throw new Error('사진을 WebP로 변환하지 못했습니다.');
   return {blob,width:canvas.width,height:canvas.height};
  }
  // Preserve visual detail where possible, but keep file comfortably
  // below the bucket's 3 MB server limit even for large mobile photos.
  let result=await optimize(1800,.82);
  if(result.blob.size>2.6*1024*1024)result=await optimize(1450,.72);
  if(result.blob.size>2.6*1024*1024)result=await optimize(1100,.62);
  if(result.blob.size>2.6*1024*1024)throw new Error('압축 후에도 사진이 너무 큽니다.');
  return result;
 }finally{URL.revokeObjectURL(link)}
}
function formatBytes(bytes){
 if(bytes>=1024*1024)return (bytes/(1024*1024)).toFixed(1)+'MB';
 return Math.max(1,Math.round(bytes/1024))+'KB';
}
async function prepareSelectedImage(){
 const file=filePicker.files?.[0];
 const version=++pickVersion;
 prepared=null;preparing=Boolean(file);
 releasePreview();details.textContent='';
 const button=form.querySelector('[type=submit]');
 button.disabled=true;
 if(!file){notify('');preparing=false;return null}
 notify('사진을 자동으로 크기 조정·압축하고 있어요…');
 try{
  const output=await normalize(file);
  // Ignore old results if the user selected a different file meanwhile.
  if(version!==pickVersion)return null;
  prepared={file,...output};
  previewUrl=URL.createObjectURL(output.blob);
  preview.src=previewUrl;
  preview.hidden=false;
  const saved=Math.max(0,Math.round((1-output.blob.size/file.size)*100));
  details.textContent='원본 '+formatBytes(file.size)+' → 업로드 '+formatBytes(output.blob.size)+
   ' · '+output.width+' × '+output.height+'px'+
   (output.blob.size<file.size?' · 약 '+saved+'% 감소':'');
  notify('사진이 최적화됐어요. 업로드할 수 있습니다.');
  return prepared;
 }catch(error){
  if(version===pickVersion){notify(error.message,true);details.textContent=''}
  return null;
 }finally{
  if(version===pickVersion){
   preparing=false;
   button.disabled=!prepared;
  }
 }
}
async function upload(event){
 event.preventDefault();
 if(submitting||!VALID_IDS.has(current))return;
 submitting=true;
 const button=form.querySelector('[type=submit]');
 button.disabled=true;notify('사진을 준비하고 있어요…');
 try{
  const permitted=await refreshEnabled();
  if(!permitted)throw new Error('현재 사진 업로드가 종료되었습니다.');
  const original=filePicker.files?.[0];
  const optimized=prepared?.file===original?prepared:await prepareSelectedImage();
  if(!optimized)throw new Error('사진을 최적화한 후 다시 시도해주세요.');
  const blob=optimized.blob;
  const path='interviews/'+current+'/'+crypto.randomUUID()+'.webp';
  const alt=$('#interview-upload-alt').value.trim().slice(0,180);
  const caption=$('#interview-upload-caption').value.trim().slice(0,300);
  notify('사진을 업로드하고 있어요…');
  await api('/storage/v1/object/'+BUCKET+'/'+path,{
   method:'POST',
   headers:{'Content-Type':'image/webp','x-upsert':'false','cache-control':'3600'},
   body:blob
  });
  // All public edits (including deletion of previously uploaded images)
  // are gated by the same server-side temporary editor switch.
  try{
   await api('/rest/v1/hetero_interview_photos',{
    method:'POST',
    headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
    body:JSON.stringify({
     interview_id:current,
     storage_path:path,
     alt:alt||original.name.replace(/\.[^.]+$/,'').slice(0,180),
     caption,
     sort_order:Math.floor(Date.now()/1000),
     created_by:null
    })
   });
  }catch(error){
   throw new Error('사진 파일은 전송됐지만 목록 등록에 실패했어요. 관리자에게 알려주세요. '+error.message);
  }
  notify('등록했어요!');
  await refresh();
  dlg.close();
 }catch(error){
  notify('업로드 실패: '+error.message,true);
 }finally{submitting=false;button.disabled=false}
}
function mount(){
 if(mounted)return;
 mounted=true;
 makeUploadButtons();
 installBasePhotoControls();
 makeTextEditButtons();
 bindContentEditors();
 refreshEnabled();
 refresh();
 refreshHiddenBase();
 loadTranscriptEdits().catch(error=>console.warn('인터뷰 편집 기록을 불러오지 못했습니다:',error));
 $('#interview-upload-close')?.addEventListener('click',()=>{if(!submitting)dlg.close()});
 dlg.addEventListener('cancel',event=>{if(submitting)event.preventDefault()});
 dlg.addEventListener('click',event=>{if(event.target===dlg&&!submitting)dlg.close()});
 dlg.addEventListener('close',()=>{
  pickVersion++;prepared=null;preparing=false;
  releasePreview();details.textContent='';
 });
 form.addEventListener('submit',upload);
 filePicker.addEventListener('change',prepareSelectedImage);
}
window.InterviewPhotoUpload={mount,open,refresh};
})();
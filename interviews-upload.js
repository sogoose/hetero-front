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
 document.querySelectorAll('.interview-add-photo').forEach(button=>{
  button.hidden=!enabled;
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
 gallery.append(figure);
}
async function refresh(){
 try{
  const records=await api('/rest/v1/hetero_interview_photos?select=id,interview_id,storage_path,alt,caption,sort_order,created_at&order=sort_order.asc,created_at.asc');
  document.querySelectorAll('.interview-live-photo').forEach(node=>node.remove());
  if(Array.isArray(records))records.forEach(renderPhoto);
 }catch(error){console.warn('인터뷰 사진 목록을 불러오지 못했습니다:',error)}
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
  // Deliberately no client-side login: created_by is NULL for anon entries.
  // Storage & database RLS independently check whether temporary uploads
  // are still open. Anonymous users are not permitted to DELETE photos.
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
 refreshEnabled();
 refresh();
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
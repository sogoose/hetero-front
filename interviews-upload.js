/* HETERO FRONT / Website photo uploads.
   Uses authenticated Supabase REST + Storage (no external JS dependency).
   Public photos stay visible to everyone; only a whitelisted editor can write.
   Access/refresh tokens remain only in this browser tab's sessionStorage. */
(() => {
'use strict';
const ENDPOINT='https://xjhwzhqiixbombbudlpl.supabase.co';
const PUBLIC_KEY='sb_publishable_5agi4GlOLYN8wc3q4NxFAw_90Y2BKjn';
const BUCKET='hetero-interview-photos';
const SESSION_KEY='hetero-interviews-editor-session-v1';
const $=s=>document.querySelector(s);
const dlg=$('#interview-upload-dialog');
const loginView=$('#interview-upload-login-view');
const uploadView=$('#interview-upload-form-view');
const loginForm=$('#interview-upload-login-form');
const uploadForm=$('#interview-upload-form');
const info=$('#interview-upload-status');
const filePicker=$('#interview-upload-file');
const preview=$('#interview-upload-preview');
const uploadTitle=$('#interview-upload-title');
let session=null;
let currentInterview=null;
let editor=false;
let mounted=false;
let busy=false;
const legalIds=new Set(['goryeong','jungwoo','chunghwa']);

function elem(tag,cl,text){
 const e=document.createElement(tag);
 if(cl)e.className=cl;
 if(text!==undefined&&text!==null)e.textContent=String(text);
 return e;
}
function alertMessage(message,error=false){
 info.textContent=message||'';
 info.classList.toggle('is-error',Boolean(error));
}
function storeSession(value){
 session=value;
 try{if(value)sessionStorage.setItem(SESSION_KEY,JSON.stringify(value));
 else sessionStorage.removeItem(SESSION_KEY)}catch(e){console.warn('Cannot store editor session in this tab',e)}
}
function restoreSession(){
 try{
  const raw=sessionStorage.getItem(SESSION_KEY);
  if(raw){const s=JSON.parse(raw);if(s&&s.access_token&&s.refresh_token)session=s}
 }catch(e){session=null}
}
function encodedPath(path){return path.split('/').map(encodeURIComponent).join('/')}
async function api(path,opts={}){
 const {method='GET',body=null,protectedRequest=false,headers={}}=opts;
 const token=protectedRequest?await accessToken():null;
 const requestHeaders={
  apikey:PUBLIC_KEY,
  ...(protectedRequest?{Authorization:'Bearer '+token}:{}),
  ...headers
 };
 const response=await fetch(ENDPOINT+path,{method,headers:requestHeaders,body});
 const raw=await response.text();
 let result=null;
 try{result=raw?JSON.parse(raw):null}catch(e){result=raw}
 if(!response.ok){
  let text=result?.msg||result?.message||result?.error_description||result?.error||('HTTP '+response.status);
  if(response.status===401&&protectedRequest)text='로그인이 만료되었습니다. 다시 로그인해주세요. '+text;
  throw new Error(String(text));
 }
 return result;
}
async function accessToken(){
 if(!session?.access_token)throw new Error('편집자 로그인이 필요합니다.');
 if((session.expires_at||0)>Date.now()+60000)return session.access_token;
 if(!session.refresh_token)throw new Error('로그인이 만료되었습니다.');
 try{
  const response=await api('/auth/v1/token?grant_type=refresh_token',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({refresh_token:session.refresh_token})
  });
  storeSession({...response,expires_at:Date.now()+(Number(response.expires_in)||3600)*1000});
  return session.access_token;
 }catch(e){
  storeSession(null);editor=false;
  throw new Error('로그인 시간이 만료되었습니다. 다시 로그인해주세요.');
 }
}
async function verifyEditor(){
 if(!session?.access_token)return false;
 const user=await api('/auth/v1/user',{protectedRequest:true});
 if(!user?.id)return false;
 const results=await api('/rest/v1/hetero_interview_editors?select=user_id&user_id=eq.'+encodeURIComponent(user.id),{
  protectedRequest:true,headers:{Accept:'application/json'}
 });
 return Array.isArray(results)&&results.length===1;
}
function updateButtons(){
 document.querySelectorAll('.interview-live-delete').forEach(btn=>{btn.hidden=!editor});
}
function setLoginMode(){
 loginView.hidden=false;uploadView.hidden=true;
 updateButtons();
}
function setUploadMode(){
 loginView.hidden=true;uploadView.hidden=false;
 uploadTitle.textContent={
  goryeong:'고령기와',jungwoo:'정우금속',chunghwa:'청화요업'
 }[currentInterview]+' 사진 추가';
 updateButtons();
}
async function open(interviewId){
 if(!legalIds.has(interviewId)||!dlg)return;
 currentInterview=interviewId;
 filePicker.value='';preview.src='';preview.hidden=true;
 uploadForm.reset();
 alertMessage('');
 setLoginMode();
 dlg.showModal();
 if(session){
  try{
   editor=await verifyEditor();
   if(editor)setUploadMode();
   else{storeSession(null);alertMessage('사진 편집 권한이 없는 계정입니다.',true)}
  }catch(error){editor=false;storeSession(null);alertMessage(error.message,true)}
 }
}
function registerUploadControls(){
 document.querySelectorAll('.interview-group').forEach(section=>{
  const id=section.dataset.interviewId;
  if(!legalIds.has(id)||section.querySelector('.interview-add-photo'))return;
  const button=elem('button','interview-add-photo','＋ 사진 추가');
  button.type='button';
  button.addEventListener('click',()=>open(id));
  section.querySelector('.interview-identity')?.append(button);
 });
}
function photoURL(storagePath){
 return ENDPOINT+'/storage/v1/object/public/'+BUCKET+'/'+encodedPath(storagePath);
}
function appendLivePhoto(record){
 if(!legalIds.has(record.interview_id)||!record.id||!record.storage_path)return;
 const group=document.getElementById(record.interview_id);
 if(!group)return;
 const aside=group.querySelector('.interview-identity');
 let gallery=aside.querySelector('.interview-gallery');
 if(!gallery){
  gallery=elem('div','interview-gallery');
  aside.insertBefore(gallery,aside.querySelector('.interview-add-photo'));
 }
 const fig=elem('figure','interview-gallery-item interview-live-photo');
 fig.dataset.liveId=record.id;
 const image=elem('img','interview-gallery-photo');
 const src=photoURL(record.storage_path);
 image.src=src;image.alt=record.alt||'인터뷰 사진';
 image.loading='lazy';image.decoding='async';
 const openButton=elem('button','interview-gallery-open');
 openButton.type='button';
 openButton.setAttribute('aria-label','사진 확대');
 openButton.append(image);
 openButton.addEventListener('click',()=>window.InterviewArchivePhoto?.openImage({
  src,alt:record.alt||'인터뷰 사진',caption:record.caption||''
 },'인터뷰 사진'));
 fig.append(openButton);
 if(record.caption)fig.append(elem('figcaption','interview-gallery-caption',record.caption));
 const del=elem('button','interview-live-delete','삭제');
 del.type='button';del.hidden=!editor;
 del.setAttribute('aria-label',record.alt?record.alt+' 사진 삭제':'사진 삭제');
 del.addEventListener('click',()=>deletePhoto(record));
 fig.append(del);
 gallery.append(fig);
}
async function loadPhotos(){
 try{
  const records=await api('/rest/v1/hetero_interview_photos?select=id,interview_id,storage_path,alt,caption,sort_order,created_at&order=sort_order.asc,created_at.asc');
  document.querySelectorAll('.interview-live-photo').forEach(n=>n.remove());
  if(Array.isArray(records))records.forEach(appendLivePhoto);
  updateButtons();
 }catch(e){
  console.warn('공개 인터뷰 사진을 불러오지 못했습니다:',e);
 }
}
async function deletePhoto(record){
 if(!editor)return;
 if(!window.confirm('이 사진을 정말 삭제할까요?'))return;
 try{
  await api('/rest/v1/hetero_interview_photos?id=eq.'+encodeURIComponent(record.id),{
   method:'DELETE',protectedRequest:true
  });
  try{
   await api('/storage/v1/object/'+BUCKET+'/'+encodedPath(record.storage_path),{
    method:'DELETE',protectedRequest:true
   });
  }catch(e){console.warn('사진 메타데이터 삭제 후 Storage 정리 실패:',e)}
  await loadPhotos();
 }catch(error){window.alert('사진을 삭제하지 못했습니다. '+error.message)}
}
async function decodeAndResize(file){
 if(!file||!file.type.startsWith('image/'))throw new Error('이미지 파일을 선택해주세요.');
 if(file.size>18*1024*1024)throw new Error('원본 사진은 18MB 이하만 업로드할 수 있어요.');
 const objectUrl=URL.createObjectURL(file);
 const image=new Image();
 try{
  image.src=objectUrl;
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('사진을 열 수 없습니다. PNG/JPG/WebP 사진을 선택해주세요.'))});
  async function compress(maxPx,quality){
   const ratio=Math.min(1,maxPx/Math.max(image.naturalWidth,image.naturalHeight));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
   canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
   const ctx=canvas.getContext('2d');
   if(!ctx)throw new Error('이 브라우저에서 사진 변환을 사용할 수 없습니다.');
   ctx.drawImage(image,0,0,canvas.width,canvas.height);
   return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
     if(blob&&blob.type==='image/webp')resolve(blob);
     else reject(new Error('WebP 변환을 지원하는 브라우저가 필요합니다.'));
    },'image/webp',quality);
   });
  }
  let blob=await compress(1800,.83);
  if(blob.size>3*1024*1024)blob=await compress(1400,.70);
  if(blob.size>3*1024*1024)throw new Error('압축 후에도 3MB를 초과해 업로드할 수 없습니다.');
  return blob;
 }finally{URL.revokeObjectURL(objectUrl)}
}
async function doLogin(event){
 event.preventDefault();if(busy)return;
 busy=true;
 const button=loginForm.querySelector('button[type=submit]');
 button.disabled=true;
 alertMessage('편집자 계정을 확인하고 있어요…');
 try{
  const email=$('#interview-editor-email').value.trim();
  const password=$('#interview-editor-password').value;
  const data=await api('/auth/v1/token?grant_type=password',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({email,password})
  });
  storeSession({...data,expires_at:Date.now()+(Number(data.expires_in)||3600)*1000});
  $('#interview-editor-password').value='';
  editor=await verifyEditor();
  if(!editor){storeSession(null);throw new Error('인터뷰 사진 편집 권한이 없는 계정입니다.')}
  setUploadMode();alertMessage('로그인되었습니다. 사진을 선택해주세요.');
 }catch(error){alertMessage('로그인 실패: '+error.message,true)}
 finally{busy=false;button.disabled=false}
}
async function doUpload(event){
 event.preventDefault();if(busy||!editor||!legalIds.has(currentInterview))return;
 busy=true;
 const button=uploadForm.querySelector('button[type=submit]');
 button.disabled=true;alertMessage('이미지를 최적화하고 있어요…');
 let uploadPath=null;
 try{
  const file=filePicker.files?.[0];
  const blob=await decodeAndResize(file);
  const token=await accessToken();
  const user=await api('/auth/v1/user',{protectedRequest:true});
  if(!user?.id)throw new Error('로그인이 필요합니다.');
  uploadPath='interviews/'+currentInterview+'/'+crypto.randomUUID()+'.webp';
  alertMessage('사진을 업로드하고 있어요…');
  await api('/storage/v1/object/'+BUCKET+'/'+encodedPath(uploadPath),{
   method:'POST',protectedRequest:true,
   headers:{'Content-Type':'image/webp','x-upsert':'false','cache-control':'3600'},
   body:blob
  });
  const alt=$('#interview-upload-alt').value.trim().slice(0,180);
  const caption=$('#interview-upload-caption').value.trim().slice(0,300);
  await api('/rest/v1/hetero_interview_photos',{
   method:'POST',protectedRequest:true,
   headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
   body:JSON.stringify({
    interview_id:currentInterview,
    storage_path:uploadPath,
    alt:alt||file.name.replace(/\.[^.]+$/,'').slice(0,180),
    caption,
    sort_order:Date.now(),
    created_by:user.id
   })
  });
  uploadPath=null;
  alertMessage('업로드 완료!');
  await loadPhotos();
  dlg.close();
 }catch(error){
  if(uploadPath){
   try{await api('/storage/v1/object/'+BUCKET+'/'+encodedPath(uploadPath),{method:'DELETE',protectedRequest:true})}catch(e){}
  }
  alertMessage('업로드 실패: '+error.message,true);
 }finally{busy=false;button.disabled=false}
}
function bind(){
 loginForm.addEventListener('submit',doLogin);
 uploadForm.addEventListener('submit',doUpload);
 $('#interview-upload-close').addEventListener('click',()=>{if(!busy)dlg.close()});
 dlg.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
 dlg.addEventListener('click',event=>{if(event.target===dlg&&!busy)dlg.close()});
 $('#interview-upload-logout').addEventListener('click',()=>{
  editor=false;storeSession(null);setLoginMode();alertMessage('로그아웃되었습니다.');
 });
 filePicker.addEventListener('change',()=>{
  const file=filePicker.files?.[0];
  if(!file){preview.hidden=true;preview.removeAttribute('src');return}
  // Data URL not persisted; preview is strictly local until Save.
  const url=URL.createObjectURL(file);
  preview.onload=()=>URL.revokeObjectURL(url);
  preview.onerror=()=>URL.revokeObjectURL(url);
  preview.src=url;preview.hidden=false;
 });
}
function mount(){
 if(mounted)return;
 mounted=true;
 restoreSession();
 bind();registerUploadControls();
 loadPhotos();
 // Show delete controls for an already-logged-in editor, but do not force a
 // login or show an editor panel on ordinary visits.
 if(session)verifyEditor().then(isEditor=>{
  editor=isEditor;
  if(!isEditor)storeSession(null);
  updateButtons();
 }).catch(()=>{editor=false;storeSession(null)});
}
window.InterviewPhotoUpload={mount,open,refresh:loadPhotos};
})();

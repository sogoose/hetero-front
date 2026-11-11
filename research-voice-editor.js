/* HETERO FRONT / Makers' voices — open-ended cards, permission-gated edits.
   Rows are stored in Supabase; editor follows the existing editing_enabled flag.
   User text is always inserted via textContent, never HTML. */
(() => {
 'use strict';
 const API='https://xjhwzhqiixbombbudlpl.supabase.co/rest/v1';
 const KEY='sb_publishable_5agi4GlOLYN8wc3q4NxFAw_90Y2BKjn';
 const $=s=>document.querySelector(s);
 const board=$('#research-witness-grid');
 const sources=$('#research-witness-sources');
 const editToggle=$('#research-voice-edit-toggle');
 const status=$('#research-witness-save-status');
 const dialog=$('#research-voice-editor');
 const form=$('#research-voice-edit-form');
 const quoteField=$('#research-voice-edit-quote');
 const creditField=$('#research-voice-edit-credit');
 const tagField=$('#research-voice-edit-tag');
 const imageField=$('#research-voice-edit-image-file');
 const imageChoose=$('#research-voice-edit-image-choose');
 const imageRemove=$('#research-voice-edit-image-remove');
 const imagePreview=$('#research-voice-image-preview');
 const imagePreviewImg=$('#research-voice-image-preview-img');
 const modalStatus=$('#research-voice-edit-status');
 const saveButton=$('#research-voice-edit-save');
 const deleteButton=$('#research-voice-edit-delete');
 const introText=$('#research-voices-lead'),introEdit=$('#research-voice-intro-edit'),introDialog=$('#research-voice-intro-dialog');
 const introForm=$('#research-voice-intro-form'),introField=$('#research-voice-intro-field');
 const introStatus=$('#research-voice-intro-status'),introSave=$('#research-voice-intro-save');
 const ICONS={brick:'assets/interviews/icons/brick.svg',cast:'assets/interviews/icons/cast.svg',roof:'assets/interviews/icons/roof.svg',tile:'assets/interviews/icons/tile.svg',merchant:'assets/interviews/icons/gangbuk-roof-tile.svg'};
 function materialOf(credit){
  const s=String(credit||'');
  if(/청화요업|벽돌/.test(s))return 'brick';
  if(/정우금속|주물/.test(s))return 'cast';
  if(/고령기와|기와/.test(s))return 'roof';
  if(/타일|도자기/.test(s))return 'tile';
  if(/강북산업|건재상/.test(s))return 'merchant';
  return 'other';
 }
 const STORAGE='https://xjhwzhqiixbombbudlpl.supabase.co/storage/v1';
 const IMAGE_BUCKET='hetero-voice-photos';
 const PHOTO_PATH=/^cards\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
 let rows=[],inEditMode=false,editingAllowed=false,activeSlot=null,initDone=false,saving=false;
 let pendingImage=null,imageRemoved=false,previewObjectURL=null;
 function photoURL(path){
  return typeof path==='string'&&PHOTO_PATH.test(path)
   ?STORAGE+'/object/public/'+IMAGE_BUCKET+'/'+path:null;
 }
 function clearImagePreview(){
  if(previewObjectURL){URL.revokeObjectURL(previewObjectURL);previewObjectURL=null;}
  imagePreview.hidden=true;
  imagePreviewImg.removeAttribute('src');
 }
 function showImagePreview(url){
  if(!url){clearImagePreview();return}
  imagePreviewImg.src=url;
  imagePreview.hidden=false;
 }
 function resetImageState(path){
  clearImagePreview();
  pendingImage=null;imageRemoved=false;
  if(imageField)imageField.value='';
  const url=photoURL(path);
  if(url)showImagePreview(url);
  if(imageRemove)imageRemove.disabled=!url;
 }
 async function compressImage(file){
  if(!file||!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))
   throw new Error('JPG, PNG, WebP 또는 AVIF 파일만 업로드할 수 있어요.');
  if(file.size>20*1024*1024)throw new Error('원본 파일은 20MB 이하여야 해요.');
  const objectUrl=URL.createObjectURL(file);
  try{
   const image=new Image();image.src=objectUrl;
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('이미지를 읽을 수 없어요.'))});
   async function encode(edge,quality){
    const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('브라우저에서 이미지를 변환하지 못했어요.');
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
     if(blob&&blob.type==='image/webp')resolve(blob);
     else reject(new Error('WebP 변환을 지원하지 않는 브라우저예요.'));
    },'image/webp',quality));
   }
   let blob=await encode(1600,.82);
   if(blob.size>2.8*1024*1024)blob=await encode(1250,.7);
   if(blob.size>2.8*1024*1024)blob=await encode(960,.62);
   if(blob.size>2.8*1024*1024)throw new Error('압축 후 용량이 2.8MB를 초과해요.');
   return blob;
  }finally{URL.revokeObjectURL(objectUrl)}
 }
 async function uploadImage(file){
  const blob=await compressImage(file);
  const path='cards/'+crypto.randomUUID()+'.webp';
  const response=await fetch(STORAGE+'/object/'+IMAGE_BUCKET+'/'+path,{
   method:'POST',headers:{apikey:KEY,'Content-Type':'image/webp','cache-control':'3600'},body:blob
  });
  if(!response.ok){
   let details='HTTP '+response.status;
   try{const problem=await response.json();details=problem.message||problem.error||details}catch(error){}
   throw new Error('이미지 업로드 실패: '+details);
  }
  return path;
 }
 function chooseImage(){
  if(!saving&&editingAllowed&&inEditMode)imageField?.click();
 }
 function selectedImage(event){
  if(saving)return;
  const file=event.target.files?.[0];
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||file.size>20*1024*1024){
   modalStatus.textContent='JPG, PNG, WebP, AVIF / 20MB 이하만 업로드해 주세요.';
   imageField.value='';return;
  }
  clearImagePreview();
  pendingImage=file;imageRemoved=false;
  previewObjectURL=URL.createObjectURL(file);
  showImagePreview(previewObjectURL);
  imageRemove.disabled=false;
  modalStatus.textContent='이미지를 선택했어요. 저장하면 카드에 반영됩니다.';
 }
 function discardImage(){
  if(saving)return;
  resetImageState(null);
  imageRemoved=true;
  modalStatus.textContent='저장하면 이 카드의 배경 이미지를 제거합니다.';
 }
 function node(tag,cls,text){
  const e=document.createElement(tag);if(cls)e.className=cls;
  if(text!==undefined&&text!==null)e.textContent=String(text);
  return e;
 }
 function setStatus(text='',error=false){
  if(!status)return;
  status.textContent=text;status.classList.toggle('is-error',error);
 }
 function draw(){
  if(!board)return;
  board.replaceChildren();
  rows.slice().sort((a,b)=>a.slot-b.slot).forEach(item=>{
   const card=node('button','research-voice-tile'+(inEditMode?' is-editable':''));
   card.type='button';card.disabled=!inEditMode;
   card.dataset.slot=String(item.slot);
   card.dataset.material=materialOf(item.credit);
   const bg=photoURL(item.background_image_path);
   if(bg){
    card.classList.add('has-photo');
    const photo=node('span','research-voice-tile-photo');
    photo.style.backgroundImage='url("'+bg+'")';
    photo.setAttribute('aria-hidden','true');
    card.append(photo);
   }
   card.title=inEditMode?'이 카드 수정':'';
   card.setAttribute('aria-label',(inEditMode?'수정: ':'')+item.quote);
   card.append(
    node('span','research-voice-tile-tag',item.tag||'기록'),
    node('span','research-voice-tile-quote',item.quote),
    node('span','research-voice-tile-credit',item.credit)
   );
   const iconSrc=ICONS[card.dataset.material];
   if(iconSrc){
    const icon=node('img','research-voice-tile-icon');
    icon.src=iconSrc;icon.alt='';icon.loading='lazy';icon.decoding='async';
    icon.setAttribute('aria-hidden','true');card.append(icon);
   }
   card.addEventListener('click',()=>openEditor(item.slot));
   board.append(card);
  });
  if(inEditMode&&editingAllowed){
   const add=node('button','research-voice-tile research-voice-add','＋ 새 증언 카드 추가');
   add.type='button';add.setAttribute('aria-label','새 증언 카드 추가');
   add.addEventListener('click',()=>openEditor(null));
   board.append(add);
  }
  board.setAttribute('aria-label','제작자들의 말 '+rows.length+'개, 아래로 스크롤하여 읽기');
 }
 function openEditor(slot){
  if(!inEditMode||!editingAllowed||!dialog||saving)return;
  const item=slot===null?null:rows.find(x=>x.slot===slot);
  if(slot!==null&&!item)return;
  activeSlot=slot;
  $('#research-voice-editor-title').textContent=slot===null?'새 증언 추가':String(slot).padStart(2,'0')+' / 증언 수정';
  quoteField.value=item?.quote||'';
  creditField.value=item?.credit||'';
  tagField.value=item?.tag||'';
  resetImageState(item?.background_image_path||null);
  if(deleteButton)deleteButton.hidden=slot===null;
  modalStatus.textContent='';
  dialog.showModal();quoteField.focus();
 }
 async function loadRows(){
  const response=await fetch(API+'/hetero_research_voice_cells?select=slot,quote,credit,tag,background_image_path&order=slot.asc',{
   headers:{apikey:KEY},cache:'no-store'
  });
  if(!response.ok)throw new Error('HTTP '+response.status);
  const json=await response.json();
  if(!Array.isArray(json))throw new Error('증언 데이터 형식 오류');
  rows=json.map(x=>({slot:Number(x.slot),quote:String(x.quote||''),credit:String(x.credit||''),tag:String(x.tag||''),background_image_path:PHOTO_PATH.test(x.background_image_path||'')?x.background_image_path:null}));
  draw();
 }
 async function hydrate(){
  try{await loadRows()}catch(error){
   console.warn('증언 데이터 로딩 오류:',error);
   setStatus('온라인 자료를 불러오지 못해 기본 자료를 표시합니다.',true);
  }
  try{
   const response=await fetch(API+'/hetero_research_voice_edit_settings?select=editing_enabled&id=eq.1',{
    headers:{apikey:KEY},cache:'no-store'
   });
   if(!response.ok)throw new Error('HTTP '+response.status);
   const settings=await response.json();
   editingAllowed=settings[0]?.editing_enabled===true;
  }catch(error){
   editingAllowed=false;
   console.warn('증언 편집 설정 확인 불가:',error);
  }
  if(!editingAllowed){
   inEditMode=false;
   if(editToggle)editToggle.hidden=true;
  }else if(editToggle)editToggle.hidden=false;
  if(introEdit)introEdit.hidden=!editingAllowed||!inEditMode;
  draw();
 }
 async function hydrateIntro(){
  try{
   const response=await fetch(API+'/hetero_research_voice_intro?select=body&id=eq.1',{headers:{apikey:KEY},cache:'no-store'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const data=await response.json();
   if(data[0]?.body&&introText)introText.textContent=data[0].body;
  }catch(error){console.warn('소개 본문 로딩 실패:',error)}
 }
 function openIntroEditor(){
  if(!editingAllowed||!inEditMode||saving||!introDialog)return;
  introField.value=introText?.textContent||'';
  introStatus.textContent='';introDialog.showModal();introField.focus();
 }
 async function saveIntro(event){
  event.preventDefault();
  if(!editingAllowed||saving)return;
  const body=introField.value.trim();
  if(!body||body.length>3000){introStatus.textContent='본문을 1~3000자로 입력해 주세요.';return}
  saving=true;introSave.disabled=true;introStatus.textContent='저장 중…';
  try{
   const response=await fetch(API+'/hetero_research_voice_intro?id=eq.1',{
    method:'PATCH',headers:{apikey:KEY,'Content-Type':'application/json','Prefer':'return=representation'},
    body:JSON.stringify({body,updated_at:new Date().toISOString()})
   });
   if(!response.ok)throw new Error('HTTP '+response.status+' '+(await response.text()).slice(0,140));
   const saved=await response.json();
   if(!Array.isArray(saved)||saved.length!==1)throw new Error('변경 사항을 확인할 수 없습니다.');
   if(introText)introText.textContent=saved[0].body;
   introDialog.close();setStatus('소개 본문 저장됨');
  }catch(error){introStatus.textContent='저장 실패: '+error.message}
  finally{saving=false;introSave.disabled=false}
 }
 function toggleEdit(){
  if(!editingAllowed)return;
  inEditMode=!inEditMode;
  editToggle.textContent=inEditMode?'DONE':'EDIT';
  editToggle.setAttribute('aria-pressed',String(inEditMode));
  setStatus(inEditMode?'카드를 선택하거나 소개 본문을 수정할 수 있습니다.':'');
  if(introEdit)introEdit.hidden=!inEditMode;
  draw();
 }
 async function save(event){
  event.preventDefault();
  if(saving||!editingAllowed)return;
  const quote=quoteField.value.trim(),credit=creditField.value.trim(),tag=tagField.value.trim();
  if(!quote||!credit){modalStatus.textContent='문장과 출처를 입력해 주세요.';return}
  if(quote.length>2000||credit.length>120||tag.length>40){modalStatus.textContent='입력 글자 수를 확인해 주세요.';return}
  saving=true;saveButton.disabled=true;modalStatus.textContent='저장 중…';
  if(imageChoose)imageChoose.disabled=true;
  if(imageRemove)imageRemove.disabled=true;
  try{
   const isNew=activeSlot===null;
   const previous=rows.find(x=>x.slot===activeSlot);
   let background_image_path=imageRemoved?null:(previous?.background_image_path||null);
   if(pendingImage){
    modalStatus.textContent='이미지 크기를 최적화하고 업로드하는 중…';
    background_image_path=await uploadImage(pendingImage);
    modalStatus.textContent='카드 내용을 저장하는 중…';
   }
   let endpoint,method,body;
   if(isNew){
    const nextSlot=Math.max(0,...rows.map(r=>r.slot))+1;
    if(nextSlot>32767)throw new Error('저장 가능한 카드 번호를 초과했습니다.');
    endpoint=API+'/hetero_research_voice_cells';
    method='POST';body={slot:nextSlot,quote,credit,tag,background_image_path};
   }else{
    endpoint=API+'/hetero_research_voice_cells?slot=eq.'+activeSlot;
    method='PATCH';body={quote,credit,tag,background_image_path};
   }
   const response=await fetch(endpoint,{
    method,headers:{apikey:KEY,'Content-Type':'application/json','Prefer':'return=representation'},
    body:JSON.stringify(body)
   });
   if(!response.ok){
    const detail=await response.text();
    throw new Error('HTTP '+response.status+' '+detail.slice(0,160));
   }
   const written=await response.json();
   if(!Array.isArray(written)||written.length!==1)throw new Error('저장을 확인하지 못했습니다.');
   await loadRows();
   resetImageState(null);
   dialog.close();setStatus('저장됨 · '+rows.length+'개 카드');
  }catch(error){
   modalStatus.textContent='저장 실패: '+error.message;
  }finally{
   saving=false;saveButton.disabled=false;
   if(imageChoose)imageChoose.disabled=false;
   if(imageRemove)imageRemove.disabled=!(pendingImage||photoURL(rows.find(x=>x.slot===activeSlot)?.background_image_path));
  }
 }
 async function remove(){
  if(saving||activeSlot===null||!editingAllowed)return;
  if(!confirm('이 증언 카드를 삭제할까요? 삭제 후 되돌릴 수 없습니다.'))return;
  saving=true;saveButton.disabled=true;if(deleteButton)deleteButton.disabled=true;
  modalStatus.textContent='삭제 중…';
  try{
   const response=await fetch(API+'/hetero_research_voice_cells?slot=eq.'+activeSlot,{
    method:'DELETE',headers:{apikey:KEY,'Prefer':'return=representation'}
   });
   if(!response.ok)throw new Error('HTTP '+response.status+' '+(await response.text()).slice(0,150));
   const removed=await response.json();
   if(!Array.isArray(removed)||removed.length!==1)throw new Error('삭제를 확인하지 못했습니다.');
   await loadRows();dialog.close();setStatus('삭제됨 · '+rows.length+'개 카드');
  }catch(error){modalStatus.textContent='삭제 실패: '+error.message}
  finally{saving=false;saveButton.disabled=false;if(deleteButton)deleteButton.disabled=false}
 }
 function close(){if(!saving&&dialog?.open){dialog.close();resetImageState(null)}}
 function init(config){
  if(initDone||!board)return;
  initDone=true;
  rows=(config.grid||[]).map(x=>({
   slot:Number(x.slot),quote:String(x.quote||''),credit:String(x.credit||''),tag:String(x.tag||''),background_image_path:PHOTO_PATH.test(x.background_image_path||'')?x.background_image_path:null
  }));
  const link=$('#research-witness-link');
  if(link){link.href=config.archiveLink||'interviews.html';link.textContent=config.archiveText||'인터뷰 전문에서 더 읽기'}
  sources.replaceChildren();
  (config.sources||[]).forEach(item=>{
   const entry=node('div','research-witness-source-row');
   entry.append(node('span','research-witness-source-material',item.material),
    node('span','research-witness-source-name',item.name));
   sources.append(entry);
  });
  draw();
  editToggle?.addEventListener('click',toggleEdit);
  introEdit?.addEventListener('click',openIntroEditor);
  introForm?.addEventListener('submit',saveIntro);
  const closeIntro=()=>{if(!saving&&introDialog?.open)introDialog.close()};
  $('#research-voice-intro-cancel')?.addEventListener('click',closeIntro);
  $('#research-voice-intro-close')?.addEventListener('click',closeIntro);
  introDialog?.addEventListener('click',event=>{if(event.target===introDialog)closeIntro()});
  form?.addEventListener('submit',save);
  imageChoose?.addEventListener('click',chooseImage);
  imageField?.addEventListener('change',selectedImage);
  imageRemove?.addEventListener('click',discardImage);
  deleteButton?.addEventListener('click',remove);
  $('#research-voice-edit-cancel')?.addEventListener('click',close);
  $('#research-voice-edit-close')?.addEventListener('click',close);
  dialog?.addEventListener('click',event=>{if(event.target===dialog)close()});
  hydrate();hydrateIntro();
 }
 window.ResearchVoiceGrid={init,isOpen:()=>Boolean(dialog?.open||introDialog?.open)};
})();

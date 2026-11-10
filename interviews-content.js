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

 /* One-hour, text-only public correction window. The database policy independently
    expires at 2026-11-10 18:19:35 UTC; photos and all other materials stay locked. */
 const EDIT_UNTIL=Date.parse('2026-11-10T18:19:35Z');
 const EDITABLE_IDS=new Set(['chunghwa','jungwoo','goryeong']);
 let textEditMode=false;
 function setupTemporaryTextEditor(){
  if(Date.now()>=EDIT_UNTIL)return;
  const anchor=document.getElementById('interview-chapter-open');
  if(!anchor)return;
  const toggle=element('button','interview-temporary-edit-toggle','텍스트 수정');
  toggle.type='button';toggle.title='벽돌·주물·기와 인터뷰의 문장을 클릭해 수정';
  toggle.setAttribute('aria-pressed','false');
  anchor.insertAdjacentElement('afterend',toggle);
  const style=element('style');
  style.textContent=`
   .interview-temporary-edit-toggle{border:1px solid #b9b5aa!important;border-radius:0!important;background:#fff!important;padding:7px 9px!important;color:#555!important;font:500 11px Pretendard,sans-serif!important;white-space:nowrap}
   .interview-temporary-edit-toggle.is-on{background:#373730!important;color:#fff!important;border-color:#373730!important}
   .interview-turn.is-temporarily-editable{cursor:text;outline:1px dashed transparent!important;outline-offset:4px}
   .interview-turn.is-temporarily-editable:hover{outline-color:#a89e92!important}
   .interview-turn.is-temporarily-editable:hover::after{content:'수정';font:400 9px Pretendard,sans-serif;color:#9a8175;grid-column:2}
   .interview-inline-correction{grid-column:1/-1;margin:6px 0 22px 25px;padding:10px 0;border-top:1px solid #dedbd5;border-bottom:1px solid #dedbd5}
   .interview-inline-correction textarea{box-sizing:border-box;width:100%;min-height:110px;padding:12px;border:1px solid #cbc5b9;border-radius:0;background:#fff;color:#292924;font:500 13px/1.65 Pretendard,sans-serif;resize:vertical;outline-offset:2px}
   .interview-inline-correction-actions{display:flex;gap:10px;align-items:center;margin-top:8px}
   .interview-inline-correction-actions button{border:1px solid #d4d0c8;border-radius:0;background:#fff;padding:7px 13px;font:500 11px Pretendard,sans-serif;color:#403f3b}
   .interview-inline-correction-actions button:first-child{background:#373730;color:white}
   .interview-inline-correction-message{color:#a64b42;font:400 11px Pretendard,sans-serif}
  `;
  document.head.append(style);
  const sync=()=>{
   if(Date.now()>=EDIT_UNTIL){textEditMode=false;toggle.remove();}
   toggle.classList.toggle('is-on',textEditMode);
   toggle.textContent=textEditMode?'수정 종료':'텍스트 수정';
   toggle.setAttribute('aria-pressed',String(textEditMode));
   document.querySelectorAll('.interview-turn').forEach(p=>{
    p.classList.toggle('is-temporarily-editable',textEditMode&&EDITABLE_IDS.has(p.closest('.interview-group')?.id));
   });
  };
  toggle.addEventListener('click',()=>{textEditMode=!textEditMode;sync();});
  document.getElementById('interview-rail')?.addEventListener('click',event=>{
   if(!textEditMode||Date.now()>=EDIT_UNTIL)return;
   const p=event.target.closest('.interview-turn.is-temporarily-editable');
   if(!p||document.querySelector('.interview-inline-correction'))return;
   const id=p.closest('.interview-group')?.id;
   if(!EDITABLE_IDS.has(id))return;
   const index=[...p.parentElement.querySelectorAll('.interview-turn')].indexOf(p);
   const contentNode=[...p.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
   if(!contentNode||index<0)return;
   const editor=element('div','interview-inline-correction');
   const textarea=element('textarea');textarea.value=contentNode.textContent||'';
   textarea.setAttribute('aria-label','인터뷰 문장 수정');
   const buttons=element('div','interview-inline-correction-actions');
   const save=element('button','','저장');save.type='button';
   const cancel=element('button','','취소');cancel.type='button';
   const message=element('span','interview-inline-correction-message');
   buttons.append(save,cancel,message);editor.append(textarea,buttons);
   p.insertAdjacentElement('afterend',editor);p.hidden=true;textarea.focus();
   const close=()=>{editor.remove();p.hidden=false;};
   cancel.onclick=close;
   save.onclick=async()=>{
    const value=textarea.value.trim();
    if(!value){message.textContent='내용을 입력해 주세요.';return;}
    if(Date.now()>=EDIT_UNTIL){message.textContent='임시 수정 시간이 종료되었습니다.';return;}
    save.disabled=true;message.textContent='저장 중…';
    try{
     const response=await fetch(ENDPOINT+'/rest/v1/hetero_interview_turn_edits?on_conflict=interview_id,turn_index',{
      method:'POST',headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({interview_id:id,turn_index:index,content:value,edited_at:new Date().toISOString()})
     });
     if(!response.ok)throw new Error('HTTP '+response.status+': '+(await response.text()).slice(0,140));
     contentNode.textContent=value;close();
    }catch(error){message.textContent='저장 실패: '+error.message;save.disabled=false;}
   };
  });
  sync();
 }

 function mount(){
  if(mounted)return;
  mounted=true;
  setupTemporaryTextEditor();
  [loadPhotos,loadHiddenBasePhotos,loadTranscriptCorrections].forEach(load=>{
   load().catch(error=>console.warn('인터뷰 공개 자료 불러오기 실패:',error));
  });
 }
 window.InterviewArchiveContent={mount};
})();

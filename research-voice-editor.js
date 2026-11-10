/* 03 / Makers' voices — a fixed 4x4 archive.
   No accounts or editor permissions are used. Public edits are restricted by
   Supabase RLS to the 16 existing quote rows; no arbitrary inserts/deletes.
   Keep all user content in textContent / input.value, never innerHTML. */
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
 const modalStatus=$('#research-voice-edit-status');
 const saveButton=$('#research-voice-edit-save');
 let rows=[],inEditMode=false,activeSlot=null,initDone=false,saving=false;

 function node(tag,cls,text){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
 }
 function setStatus(text='',error=false){
  status.textContent=text;
  status.classList.toggle('is-error',error);
 }
 function draw(){
  board.replaceChildren();
  for(let slot=1;slot<=16;slot++){
   const item=rows.find(x=>x.slot===slot)||{slot,quote:'',credit:'',tag:''};
   const card=node('button','research-voice-tile'+(inEditMode?' is-editable':''));card.type='button';
   card.disabled=!inEditMode;
   card.dataset.slot=String(slot);
   card.title=(inEditMode?'문장 수정: ':'')+item.quote;
   card.setAttribute('aria-label',slot+'번 증언'+(inEditMode?' 수정':'')+': '+item.quote);
   card.append(node('span','research-voice-tile-tag',item.tag||''));
   card.append(node('span','research-voice-tile-quote',item.quote||''));
   card.append(node('span','research-voice-tile-credit',item.credit||''));
   card.addEventListener('click',()=>openEditor(slot));
   board.append(card);
  }
 }
 function openEditor(slot){
  if(!inEditMode||!dialog||saving)return;
  const item=rows.find(x=>x.slot===slot);
  if(!item)return;
  activeSlot=slot;
  $('#research-voice-editor-title').textContent=String(slot).padStart(2,'0')+' / 증언 수정';
  quoteField.value=item.quote;
  creditField.value=item.credit;
  tagField.value=item.tag||'';
  modalStatus.textContent='';
  dialog.showModal();
  quoteField.focus();
 }
 async function hydrate(){
  try{
   const response=await fetch(API+'/hetero_research_voice_cells?select=slot,quote,credit,tag&order=slot.asc',
    {headers:{apikey:KEY},cache:'no-store'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const json=await response.json();
   if(!Array.isArray(json)||json.length!==16)throw new Error('16개 증언을 불러오지 못했습니다.');
   rows=json.map(x=>({slot:Number(x.slot),quote:String(x.quote||''),credit:String(x.credit||''),tag:String(x.tag||'')}));
   draw();
  }catch(error){
   console.warn('증언 저장 데이터 로딩 오류; 정적 자료 표시:',error);
   setStatus('온라인 수정 자료를 불러오지 못했습니다.',true);
  }
  // When edits are permanently closed, the server controls the permission
  // and this UI also hides the edit affordance.
  try{
   const response=await fetch(API+'/hetero_research_voice_edit_settings?select=editing_enabled&id=eq.1',
    {headers:{apikey:KEY},cache:'no-store'});
   if(response.ok){
    const settings=await response.json();
    if(settings[0]?.editing_enabled===false){
     inEditMode=false;editToggle.hidden=true;draw();
    }
   }
  }catch(error){console.warn('Edit status unavailable:',error)}
 }
 function toggleEdit(){
  inEditMode=!inEditMode;
  editToggle.textContent=inEditMode?'DONE':'EDIT';
  editToggle.setAttribute('aria-pressed',String(inEditMode));
  setStatus(inEditMode?'수정할 정사각형을 선택하세요.':'');
  draw();
 }
 async function save(event){
  event.preventDefault();
  if(saving||activeSlot===null)return;
  const quote=quoteField.value.trim();
  const credit=creditField.value.trim();
  const tag=tagField.value.trim();
  if(!quote||!credit){modalStatus.textContent='문장과 출처를 입력해 주세요.';return}
  saving=true;saveButton.disabled=true;modalStatus.textContent='저장 중…';
  try{
   const response=await fetch(API+'/hetero_research_voice_cells?slot=eq.'+activeSlot,{
    method:'PATCH',
    headers:{apikey:KEY,'Content-Type':'application/json','Prefer':'return=representation'},
    body:JSON.stringify({quote,credit,tag})
   });
   if(!response.ok){
    let message='HTTP '+response.status;
    try{const issue=await response.json();message=issue.message||issue.error||message}catch(e){}
    throw new Error(message);
   }
   const saved=await response.json();
   if(!Array.isArray(saved)||saved.length!==1)throw new Error('변경된 문장을 확인할 수 없습니다.');
   const idx=rows.findIndex(x=>x.slot===activeSlot);
   if(idx>=0)rows[idx]={slot:activeSlot,quote,credit,tag};
   draw();dialog.close();setStatus('저장됨');
  }catch(error){
   modalStatus.textContent='저장 실패: '+error.message;
  }finally{saving=false;saveButton.disabled=false}
 }
 function close(){if(!saving&&dialog.open)dialog.close()}
 function init(config){
  if(initDone||!board)return;
  initDone=true;
  rows=(config.grid||[]).map(x=>({slot:Number(x.slot),quote:String(x.quote||''),credit:String(x.credit||''),tag:String(x.tag||'')}));
  const link=$('#research-witness-link');
  if(link){link.href=config.archiveLink||'interviews.html';link.textContent=config.archiveText||'인터뷰 전문에서 더 읽기'}
  sources.replaceChildren();
  (config.sources||[]).forEach(item=>{
   const row=node('div','research-witness-source-row');
   row.append(node('span','research-witness-source-material',item.material));
   row.append(node('span','research-witness-source-name',item.name));
   sources.append(row);
  });
  draw();
  editToggle?.addEventListener('click',toggleEdit);
  form?.addEventListener('submit',save);
  $('#research-voice-edit-cancel')?.addEventListener('click',close);
  $('#research-voice-edit-close')?.addEventListener('click',close);
  dialog?.addEventListener('click',event=>{if(event.target===dialog)close()});
  hydrate();
 }
 window.ResearchVoiceGrid={init,isOpen:()=>Boolean(dialog?.open)};
})();

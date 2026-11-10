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
 let rows=[],inEditMode=false,editingAllowed=false,activeSlot=null,initDone=false,saving=false;
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
  if(deleteButton)deleteButton.hidden=slot===null;
  modalStatus.textContent='';
  dialog.showModal();quoteField.focus();
 }
 async function loadRows(){
  const response=await fetch(API+'/hetero_research_voice_cells?select=slot,quote,credit,tag&order=slot.asc',{
   headers:{apikey:KEY},cache:'no-store'
  });
  if(!response.ok)throw new Error('HTTP '+response.status);
  const json=await response.json();
  if(!Array.isArray(json))throw new Error('증언 데이터 형식 오류');
  rows=json.map(x=>({slot:Number(x.slot),quote:String(x.quote||''),credit:String(x.credit||''),tag:String(x.tag||'')}));
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
  try{
   const isNew=activeSlot===null;
   let endpoint,method,body;
   if(isNew){
    const nextSlot=Math.max(0,...rows.map(r=>r.slot))+1;
    if(nextSlot>32767)throw new Error('저장 가능한 카드 번호를 초과했습니다.');
    endpoint=API+'/hetero_research_voice_cells';
    method='POST';body={slot:nextSlot,quote,credit,tag};
   }else{
    endpoint=API+'/hetero_research_voice_cells?slot=eq.'+activeSlot;
    method='PATCH';body={quote,credit,tag};
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
   dialog.close();setStatus('저장됨 · '+rows.length+'개 카드');
  }catch(error){
   modalStatus.textContent='저장 실패: '+error.message;
  }finally{saving=false;saveButton.disabled=false}
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
 function close(){if(!saving&&dialog?.open)dialog.close()}
 function init(config){
  if(initDone||!board)return;
  initDone=true;
  rows=(config.grid||[]).map(x=>({
   slot:Number(x.slot),quote:String(x.quote||''),credit:String(x.credit||''),tag:String(x.tag||'')
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
  deleteButton?.addEventListener('click',remove);
  $('#research-voice-edit-cancel')?.addEventListener('click',close);
  $('#research-voice-edit-close')?.addEventListener('click',close);
  dialog?.addEventListener('click',event=>{if(event.target===dialog)close()});
  hydrate();hydrateIntro();
 }
 window.ResearchVoiceGrid={init,isOpen:()=>Boolean(dialog?.open||introDialog?.open)};
})();

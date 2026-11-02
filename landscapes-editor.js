/* HETERO FRONT / browser-side editor.
 * No token is ever requested or stored. GitHub remains the public source of truth.
 * Drafts are local to this browser; publish only by replacing CSV/JSON on GitHub.
 */
(() => {
 'use strict';
 const BASE='assets/buildings/';
 const KEY='hetero-front-editor-drafts-v1';
 const modal=document.getElementById('archive-editor');
 const openBtn=document.getElementById('archive-edit-open');
 const closeBtn=document.getElementById('archive-edit-close');
 const recordSelect=document.getElementById('editor-record');
 const form=document.getElementById('archive-editor-form');
 const pickBtn=document.getElementById('editor-pick');
 const status=document.getElementById('editor-save-status');
 const board=document.getElementById('photo-board');
 if(!modal||!openBtn||!board)return;
 const REG_FIELDS=['construction_year','year_status','approval_date','structure','structure_status',
  'wall_finish','wall_status','roof_finish','roof_status','railing','railing_status','year_source','notes'];
 const META_FIELDS=['description','material'];
 let headers=[], rows=[], rowMap=new Map(), metadata={}, ready=false, pending=null, picking=false;
 let drafts={};
 try{const fromStorage=JSON.parse(localStorage.getItem(KEY)||'{}');if(fromStorage&&typeof fromStorage==='object')drafts=fromStorage;}catch{}
 function parseCSV(text){
  const parsed=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
   else if(c===','&&!quoted){row.push(cell);cell='';}
   else if((c==='\r'||c==='\n')&&!quoted){
    if(c==='\r'&&text[i+1]==='\n')i++;
    row.push(cell);if(row.some(v=>v))parsed.push(row);
    cell='';row=[];
   }else cell+=c;
  }
  row.push(cell);if(row.some(v=>v))parsed.push(row);
  const keys=(parsed.shift()||[]).map(x=>x.replace(/^\uFEFF/,'').trim());
  return {headers:keys, rows:parsed.map(values=>Object.fromEntries(keys.map((key,i)=>[key,values[i]||''])))};
 }
 function csvCell(v){const s=String(v??'');return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
 function validFile(file){return typeof file==='string'&&/^photo-[a-z0-9-]+\.(?:webp|jpe?g|png|avif)$/i.test(file)}
 async function fetchData(){
  if(ready)return;
  const response=await Promise.all([
   fetch(BASE+'registry.csv',{cache:'no-store'}),
   fetch(BASE+'metadata.json',{cache:'no-store'})
  ]);
  if(!response.every(x=>x.ok))throw Error('건축물 정보를 불러올 수 없습니다.');
  const [csv,meta]=await Promise.all([response[0].text(),response[1].json()]);
  const parsed=parseCSV(csv);
  if(!parsed.headers.includes('file')||!parsed.rows.length||!meta||typeof meta!=='object')
   throw Error('원장 형식을 확인할 수 없습니다.');
  headers=parsed.headers;
  rows=parsed.rows.filter(row=>validFile(row.file));
  rowMap=new Map(rows.map(row=>[row.file,row]));
  metadata=meta;
  recordSelect.replaceChildren();
  for(const row of rows){
   const opt=document.createElement('option');opt.value=row.file;
   const m=metadata[row.file]||{};
   opt.textContent=(m.title||m.location||'기록')+' · '+row.file.replace(/\.webp$/,'').slice(-6);
   recordSelect.append(opt);
  }
  ready=true;
 }
 function field(name){return form.elements.namedItem(name)}
 function merged(file){
  const original=rowMap.get(file)||{};
  const update=drafts[file]||{};
  const m=metadata[file]||{};
  return {...m,...original,...(update.meta||{}),...(update.registry||{})};
 }
 function selectRecord(file){
  if(!rowMap.has(file))return;
  recordSelect.value=file;
  const data=merged(file);
  for(const fieldName of REG_FIELDS.concat(META_FIELDS)){
   const control=field(fieldName);
   if(control)control.value=data[fieldName]||'';
  }
  const locationField=field('location');
  if(locationField)locationField.value=data.location||'';
  status.textContent=drafts[file]?'이 건물에는 브라우저에 저장된 수정 초안이 있습니다.':'수정 후 초안 저장을 눌러주세요.';
 }
 async function show(file){
  modal.showModal();
  status.textContent='기록을 불러오는 중입니다.';
  recordSelect.disabled=true;form.querySelector('.editor-primary').disabled=true;
  try{
   await fetchData();
   recordSelect.disabled=false;form.querySelector('.editor-primary').disabled=false;
   selectRecord(file&&rowMap.has(file)?file:recordSelect.value||rows[0]?.file);
  }catch(e){status.textContent='불러오기 실패: '+(e.message||e)}
 }
 function stopPicking(){
  picking=false;board.classList.remove('is-picking');
  openBtn.setAttribute('aria-pressed','false');
 }
 function save(){
  const file=recordSelect.value;
  if(!rowMap.has(file)){status.textContent='먼저 기록을 선택해 주세요.';return}
  const patch={registry:{},meta:{}};
  for(const k of REG_FIELDS){const c=field(k);if(c)patch.registry[k]=c.value.trim()}
  for(const k of META_FIELDS){const c=field(k);if(c)patch.meta[k]=c.value.trim()}
  if(patch.registry.approval_date&&!/^\d{4}-\d{2}-\d{2}$/.test(patch.registry.approval_date)){
   status.textContent='사용승인일은 YYYY-MM-DD 형식으로 입력해 주세요.';field('approval_date').focus();return;
  }
  drafts[file]=patch;
  try{localStorage.setItem(KEY,JSON.stringify(drafts))}
  catch{status.textContent='브라우저 저장 공간이 제한되어 초안을 보관하지 못했습니다.';return}
  status.textContent='이 브라우저에 초안 저장 완료. 공개 반영은 아래 CSV / JSON 내보내기로 진행해 주세요.';
 }
 function download(name,content,type){
  const blob=new Blob(['\uFEFF',content],{type:type+';charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=name;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 function exportCSV(){
  if(!ready){status.textContent='원장 로딩이 끝난 뒤 내보내 주세요.';return}
  const updated=rows.map(row=>({...row,...(drafts[row.file]?.registry||{})}));
  const content=[headers.map(csvCell).join(','),...updated.map(row=>headers.map(k=>csvCell(row[k])).join(','))].join('\r\n')+'\r\n';
  download('registry.csv',content,'text/csv');
  status.textContent='CSV 다운로드 완료. GitHub의 assets/buildings/registry.csv에 교체 업로드해야 공개 반영됩니다.';
 }
 function exportJSON(){
  if(!ready){status.textContent='정보 로딩이 끝난 뒤 내보내 주세요.';return}
  const copy=JSON.parse(JSON.stringify(metadata));
  for(const [file,patch] of Object.entries(drafts)){
   if(!copy[file]||!patch.meta)continue;
   Object.assign(copy[file],patch.meta);
  }
  download('metadata.json',JSON.stringify(copy,null,2)+'\n','application/json');
  status.textContent='JSON 다운로드 완료. GitHub의 assets/buildings/metadata.json에 교체 업로드해야 공개 반영됩니다.';
 }
 openBtn.addEventListener('click',()=>{stopPicking();show();});
 closeBtn.addEventListener('click',()=>modal.close());
 recordSelect.addEventListener('change',()=>selectRecord(recordSelect.value));
 form.addEventListener('submit',event=>{event.preventDefault();save()});
 document.getElementById('editor-export-csv').addEventListener('click',exportCSV);
 document.getElementById('editor-export-json').addEventListener('click',exportJSON);
 pickBtn.addEventListener('click',()=>{
  if(!ready)return;
  modal.close();picking=true;board.classList.add('is-picking');openBtn.setAttribute('aria-pressed','true');
 });
 board.addEventListener('pointerdown',event=>{
  if(!picking||!event.target.closest('.polaroid'))return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 },true);
 board.addEventListener('click',event=>{
  if(!picking)return;
  const card=event.target.closest('.polaroid');if(!card)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  const img=card.querySelector('.polaroid-image img');
  if(!img)return;
  const file=decodeURIComponent((img.getAttribute('src')||'').split('?')[0].split('/').pop());
  stopPicking();
  show(file);
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&picking)stopPicking()});
})();

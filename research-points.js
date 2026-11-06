/* Factory point annotations for HETERO FRONT Research.
   Coordinates refer to the original PNG artboard (x/y normalized 0..1).
   No business names or coordinates are inferred from the raster map.
   Published points: assets/research/factory-points.json
   Draft points: this browser's localStorage; export JSON to publish. */
(() => {
'use strict';
const $=s=>document.querySelector(s);
const context={getSelection:null,selectMaterial:null,isAvailable:null};
const state={points:[],editing:false,selected:null,draft:null,initialized:false,renderKey:0};
const storageKey='hetero-front-research-factory-points-v1';
const materialLabels={brick:'벽돌',cast:'주물',tile:'기와'};
const form=$('#research-factory-form'),dlg=$('#research-factory-editor'),panel=$('#research-factory-panel');
const editButton=$('#research-factory-edit-toggle'),exportButton=$('#research-factory-export');
function field(id){return document.getElementById('research-factory-'+id)}
function el(tag,className,txt){
 const e=document.createElement(tag);
 if(className)e.className=className;
 if(txt!==undefined&&txt!==null)e.textContent=String(txt);
 return e;
}
function cleanPoint(p){
 if(!p||!materialLabels[p.material]||![1991,2026].includes(Number(p.year)))return null;
 const x=Number(p.x),y=Number(p.y);
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1)return null;
 if(!p.id||!String(p.name||'').trim())return null;
 return {
  id:String(p.id).slice(0,80),name:String(p.name).trim().slice(0,130),
  material:p.material,year:Number(p.year),
  x:Number(x.toFixed(6)),y:Number(y.toFixed(6)),
  region:String(p.region||'').slice(0,140),
  note:String(p.note||'').slice(0,600),
  source:String(p.source||'').slice(0,250)
 };
}
function persist(){
 try{localStorage.setItem(storageKey,JSON.stringify({version:1,coordinateSystem:'original-map-image-normalized',points:state.points}))}
 catch(e){console.warn('Could not save factory drafts locally:',e)}
}
function activeSelection(){return context.getSelection?context.getSelection():{year:1991,material:'brick'}}
function visiblePoints(){
 const {year,material}=activeSelection();
 return state.points.filter(p=>p.year===year&&(material==='combined'||p.material===material));
}
function findImage(){
 return $('#research-map-art .research-map-stack .research-map-base');
}
function positionPins(){
 const wrap=$('#research-map-art .research-factory-pins'),image=findImage();
 if(!wrap||!image)return;
 const bounds=image.getBoundingClientRect(),root=wrap.getBoundingClientRect();
 if(!bounds.width||!bounds.height||!root.width)return;
 wrap.querySelectorAll('[data-point-id]').forEach(pin=>{
  const p=state.points.find(x=>x.id===pin.dataset.pointId);
  if(!p)return;
  pin.style.left=(bounds.left-root.left+p.x*bounds.width)+'px';
  pin.style.top=(bounds.top-root.top+p.y*bounds.height)+'px';
 });
}
function update(){
 const stack=$('#research-map-art .research-map-stack');
 if(!stack)return;
 const old=stack.querySelector('.research-factory-pins');
 if(old)old.remove();
 const layer=el('div','research-factory-pins');
 layer.setAttribute('aria-label','등록된 공장 위치');
 stack.append(layer);
 const list=visiblePoints();
 for(const point of list){
  const button=el('button','research-factory-pin',state.points.indexOf(point)<9?'·':'·');
  button.type='button';button.dataset.pointId=point.id;
  button.dataset.material=point.material;
  button.setAttribute('aria-label',point.name+' / '+point.year+'년 '+materialLabels[point.material]+'공장');
  button.title=point.name;
  if(state.selected===point.id)button.classList.add('is-active');
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();selectPoint(point)});
  layer.append(button);
 }
 const image=findImage();
 if(image&&!image.complete)image.addEventListener('load',positionPins,{once:true});
 requestAnimationFrame(positionPins);
 if(state.selected&&!list.some(p=>p.id===state.selected)){
  state.selected=null;panel.hidden=true;
 } else if(state.selected){
  const point=list.find(p=>p.id===state.selected);
  if(point)showPoint(point);
 }
}
function showPoint(point){
 panel.replaceChildren();
 const close=el('button','research-factory-close','×');
 close.type='button';close.setAttribute('aria-label','업체 정보 닫기');
 close.addEventListener('click',()=>{state.selected=null;panel.hidden=true;update()});
 const heading=el('h2','research-factory-name',point.name);
 const subtitle=el('p','research-factory-subtitle',point.year+'년 · '+materialLabels[point.material]+'공장'+(point.region?' · '+point.region:''));
 const top=el('div','research-factory-summary');
 top.append(heading,close);panel.append(top,subtitle);
 if(point.note)panel.append(el('p','research-factory-note',point.note));
 if(point.source)panel.append(el('p','research-factory-source','출처: '+point.source));
 if(state.editing){
  const edit=el('button','research-factory-edit-link','정보 수정');
  edit.type='button';edit.addEventListener('click',()=>openEditor(point));
  panel.append(edit);
 }
 panel.hidden=false;
}
function selectPoint(point){
 state.selected=point.id;
 showPoint(point);
 update();
}
function openEditor(point){
 const sel=activeSelection();
 state.draft=point?{...point}:{
  id:null,name:'',material:sel.material==='combined'?'brick':sel.material,
  year:sel.year,x:0.5,y:0.5,region:'',note:'',source:''
 };
 const d=state.draft;
 field('name').value=d.name;
 field('material').value=d.material;
 field('year').value=String(d.year);
 field('region').value=d.region;
 field('note').value=d.note;
 field('source').value=d.source;
 field('coordinate').textContent='지도 좌표 · '+Math.round(d.x*1000)/10+'% / '+Math.round(d.y*1000)/10+'%';
 const del=field('delete');del.hidden=!Boolean(d.id);
 $('#research-factory-editor-title').textContent=d.id?'업체 정보 수정':'업체 위치 기록';
 dlg.showModal();
 field('name').focus({preventScroll:true});
}
function mapClick(event){
 if(!state.editing)return true; // Suppress the map's legacy image-detail click.
 if(event.target.closest('.research-factory-pin'))return true;
 const img=findImage();
 if(!img)return true;
 const r=img.getBoundingClientRect();
 if(!r.width||!r.height)return true;
 const x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;
 if(x<.06||x>1||y<0||y>1)return true; // cropped artboard edge
 const sel=activeSelection();
 const material=sel.material==='combined'?'brick':sel.material;
 if(context.isAvailable&&!context.isAvailable(material,sel.year))return true;
 openEditor({id:null,name:'',material,year:sel.year,x,y,region:'',note:'',source:''});
 return true;
}
function toggleEditing(){
 state.editing=!state.editing;
 editButton.textContent=state.editing?'입력 완료':'업체 위치 입력';
 editButton.setAttribute('aria-pressed',String(state.editing));
 exportButton.hidden=!state.editing;
 const map=$('#research-map-art');
 map.classList.toggle('research-factory-tagging',state.editing);
 const selected=state.points.find(p=>p.id===state.selected);
 if(selected)showPoint(selected);
}
function exportJSON(){
 const data={version:1,coordinateSystem:'original-map-image-normalized',points:state.points.slice().sort((a,b)=>a.year-b.year||a.material.localeCompare(b.material)||a.name.localeCompare(b.name,'ko'))};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='factory-points.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function init({getSelection,selectMaterial,isAvailable}){
 if(state.initialized)return;
 state.initialized=true;
 Object.assign(context,{getSelection,selectMaterial,isAvailable});
 let published=[];
 try{
  const response=await fetch('assets/research/factory-points.json',{cache:'no-cache'});
  if(response.ok){
   const payload=await response.json();
   if(Array.isArray(payload.points))published=payload.points.map(cleanPoint).filter(Boolean);
  }
 }catch(err){console.warn('Factory records not yet available:',err)}
 let draft=[];
 try{
  const saved=localStorage.getItem(storageKey);
  if(saved){
   const obj=JSON.parse(saved);
   if(Array.isArray(obj.points))draft=obj.points.map(cleanPoint).filter(Boolean);
  }
 }catch(err){console.warn('Unable to read local factory point drafts:',err)}
 const byId=new Map(published.map(p=>[p.id,p]));
 draft.forEach(p=>byId.set(p.id,p));
 state.points=[...byId.values()];
 editButton.addEventListener('click',toggleEditing);
 exportButton.addEventListener('click',exportJSON);
 $('#research-factory-cancel').addEventListener('click',()=>dlg.close());
 dlg.addEventListener('click',event=>{if(event.target===dlg)dlg.close()});
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const draft=state.draft;if(!draft)return;
  const material=field('material').value,year=Number(field('year').value);
  if(!materialLabels[material]||![1991,2026].includes(year))return;
  if(context.isAvailable&&!context.isAvailable(material,year)){
   field('coordinate').textContent='해당 연도의 이 재료 지도는 아직 없습니다.';
   return;
  }
  const p=cleanPoint({
   ...draft,
   id:draft.id||('factory-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*1e5).toString(36)),
   name:field('name').value.trim(),
   material,year,region:field('region').value.trim(),
   note:field('note').value.trim(),source:field('source').value.trim()
  });
  if(!p)return;
  const existing=state.points.findIndex(x=>x.id===p.id);
  if(existing>=0)state.points[existing]=p;
  else state.points.push(p);
  persist();dlg.close();
  if(context.selectMaterial)context.selectMaterial(p.material,p.year);
  selectPoint(p);
  update();
 });
 field('delete').addEventListener('click',()=>{
  if(!state.draft?.id)return;
  state.points=state.points.filter(p=>p.id!==state.draft.id);
  state.selected=null;panel.hidden=true;persist();dlg.close();update();
 });
 window.addEventListener('resize',()=>requestAnimationFrame(positionPins));
}
window.ResearchPoints={init,update,mapClick,hasPoints:()=>state.points.length>0};
})();
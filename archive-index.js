/* HETERO FRONT / One INDEX for every archive page.
   Preserve existing dialog nodes and close buttons: other page scripts keep
   their showModal()/close() listeners and modal keyboard handling. */
(() => {
 'use strict';
 const pages = [
  ['index.html','00','INTRO','소개'],
  ['landscapes.html','01','LANDSCAPES','풍경'],
  ['materials.html','02','MATERIALS','재료'],
  ['research.html','03','RESEARCH','연구'],
  ['interviews.html','04','INTERVIEWS','인터뷰'],
  ['exhibition.html','05','EXHIBITION','전시'],
  ['who-are-we.html','+','ATELIER 作','우리 소개']
 ];
 function node(tag,className,text){
  const el=document.createElement(tag);
  if(className) el.className=className;
  if(text!==undefined)el.textContent=text;
  return el;
 }
 function install(){
  const dialog=document.querySelector('dialog#chapter-menu,dialog#event-menu-dialog,dialog#studio-menu-dialog');
  if(!dialog || dialog.dataset.hfIndexReady==='true')return;
  const close=dialog.querySelector('#chapter-close,#event-menu-close,#studio-chapter-close');
  if(!close)return;
  // Retain the exact button node, so registered listeners still work.
  close.classList.add('hf-index-close');
  close.textContent='×';
  close.setAttribute('title','목차 닫기');
  close.setAttribute('aria-label','목차 닫기');
  const header=node('header','hf-index-head');
  const title=node('span','hf-index-identity','HETERO FRONT');
  title.id='chapter-title'; // preserve aria-labelledby on archive dialogs
  const meta=node('span','hf-index-meta','INDEX / 07');
  header.append(title,meta,close);
  const nav=node('nav','hf-index-nav');
  nav.setAttribute('aria-label','전시 아카이브 전체 목차');
  const path=decodeURIComponent(location.pathname.split('/').pop()||'index.html').toLowerCase();
  pages.forEach(([href,no,en,ko])=>{
   const a=node('a','hf-index-row');
   a.href=href;
   a.append(node('span','hf-index-row-no',no),
            node('span','hf-index-row-en',en),
            node('span','hf-index-row-ko',ko));
   if(path===href)a.setAttribute('aria-current','page');
   nav.append(a);
  });
  const footer=node('footer','hf-index-foot');
  footer.append(node('span','', 'ATELIER 作'),node('span','','ARCHIVE · 2026'));
  dialog.replaceChildren(header,nav,footer);
  dialog.classList.add('hf-index');
  dialog.dataset.hfIndexReady='true';
  dialog.addEventListener('click',event=>{
   if(event.target===dialog)dialog.close();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();

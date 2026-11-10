/* One-screen Atelier 作 photo constellation, 12 original-ratio images.
   No third-party listing calls, no gallery editor and no image enlargement. */
(() => {
 'use strict';
 const grid=document.getElementById('studio-gallery-grid');
 if (grid) {
  const base='assets/team/gallery/';
  const images=['image3.png','image4.png','image5.png','image6.png','image7.png','image8.jpeg','image9.jpeg','image10.png','image11.png','image12.png','image13.jpeg','image14.jpeg'];
  const frag=document.createDocumentFragment();
  images.forEach((name,i)=>{
    const fig=document.createElement('figure');
    fig.className='studio-gallery-item';
    if(i===1||i===11)fig.classList.add('is-featured');
    const img=document.createElement('img');
    img.src=base+encodeURIComponent(name);
    img.alt='아뜰리에 작 작업 기록 '+(i+1);
    img.loading='eager';
    img.decoding='async';
    img.draggable=false;
    fig.append(img);
    frag.append(fig);
  });
  grid.append(frag);
 }
 const dialog=document.getElementById('studio-menu-dialog');
 const open=document.getElementById('studio-chapter-open');
 const close=document.getElementById('studio-chapter-close');
 open?.addEventListener('click',()=>dialog?.showModal());
 close?.addEventListener('click',()=>dialog?.close());
 dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
})();

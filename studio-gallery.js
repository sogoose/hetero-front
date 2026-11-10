/* Atelier 作 gallery: original image ratios, airy masonry composition.
   The second and twelfth images are intentionally emphasized.
   No upload buttons, cropping, or image enlargement. */
(() => {
  'use strict';
  const grid = document.getElementById('studio-gallery-grid');
  if (!grid) return;
  const base = 'assets/team/gallery/';
  const api = 'https://api.github.com/repos/sogoose/hetero-front/contents/' + base + '?ref=main';
  const formats = /\.(?:png|jpe?g|webp|avif|gif|svg)$/i;
  let frame = 0;
  function arrange() {
    frame = 0;
    const css = getComputedStyle(grid);
    const row = parseFloat(css.gridAutoRows) || 8;
    const gap = parseFloat(css.rowGap) || 0;
    grid.querySelectorAll('.studio-gallery-item').forEach(figure => {
      const img = figure.querySelector('img');
      if (!img || !img.complete || !img.naturalWidth) return;
      const height = img.getBoundingClientRect().height;
      figure.style.gridRowEnd = 'span ' + Math.max(1, Math.ceil((height + gap) / (row + gap)));
    });
  }
  function scheduleArrange() {
    if (!frame) frame = requestAnimationFrame(arrange);
  }
  async function load() {
    try {
      const response = await fetch(api, {headers: {'Accept':'application/vnd.github+json'}});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error('Unexpected gallery response');
      const photos = entries.filter(item => item.type === 'file' && formats.test(item.name))
        .sort((a,b) => a.name.localeCompare(b.name,'ko',{numeric:true}));
      photos.forEach((item, i) => {
        const figure = document.createElement('figure');
        figure.className = 'studio-gallery-item';
        if (i === 1 || i === 11) figure.classList.add('is-featured');
        const img = document.createElement('img');
        img.src = base + encodeURIComponent(item.name);
        img.alt = item.name.replace(/\.[^.]+$/, '').replace(/[-_]/g,' ');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('load', scheduleArrange);
        figure.append(img);
        grid.append(figure);
      });
      scheduleArrange();
    } catch (error) {
      console.warn('Atelier gallery could not be loaded:', error);
    }
  }
  window.addEventListener('resize', scheduleArrange, {passive:true});
  load();
})();

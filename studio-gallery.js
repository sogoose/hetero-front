/* HETERO FRONT / ATELIER gallery.
   Public photos are discovered from the repo. Uploads happen on GitHub, not
   through an unauthenticated browser API. No lightbox or enlargement. */
(() => {
  'use strict';
  const grid = document.getElementById('studio-gallery-grid');
  const add = document.getElementById('studio-gallery-add');
  const status = document.getElementById('studio-gallery-status');
  if (!grid || !add) return;
  const base = 'assets/team/gallery/';
  const api = 'https://api.github.com/repos/sogoose/hetero-front/contents/' + base + '?ref=main';
  const formats = /\.(?:png|jpe?g|webp|avif|gif|svg)$/i;
  async function load() {
    try {
      const response = await fetch(api, { headers: { 'Accept': 'application/vnd.github+json' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error('Unexpected gallery response');
      const photos = entries.filter(item => item.type === 'file' && formats.test(item.name))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko', {numeric: true}));
      photos.forEach(item => {
        const figure = document.createElement('figure');
        figure.className = 'studio-gallery-item';
        const img = document.createElement('img');
        img.src = base + encodeURIComponent(item.name);
        img.alt = item.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        img.loading = 'lazy';
        img.decoding = 'async';
        figure.append(img);
        grid.insertBefore(figure, add);
      });
      if (status) status.textContent = photos.length ? photos.length + '장 기록됨 · + 버튼으로 사진 추가' : '사진을 추가하면 이곳에 표시됩니다.';
    } catch (error) {
      if (status) status.textContent = '사진 목록을 불러오지 못했습니다. 새로고침해 주세요.';
    }
  }
  load();
})();

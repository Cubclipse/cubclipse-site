/* =====================================================================
   CUBCLIPSE CATALOG — reads /data/products-*.json (edited via /admin CMS)
   Automatically expands legacy "colors" arrays into separate products,
   so you never have to manually split JSON data by hand.
   ===================================================================== */

// Vytáhne src z fotky ať je to string, nebo objekt {photo}/{src}
function getPhotoSrc(photo, fallback){
  if(!photo) return fallback;
  return typeof photo === 'string' ? photo : (photo.photo || photo.src || fallback);
}

// Vytvoří bezpečný slug z názvu barvy (Onyx Black -> onyx-black)
function slugify(str){
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // odstraní diakritiku
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Pokud produkt má neprázdné "colors", rozdělí ho na samostatné produkty (jeden na barvu).
// Jinak vrátí produkt beze změny v poli.
function expandProductColors(p){
  if(!p.colors || p.colors.length === 0) return [p];

  return p.colors.map(c => {
    const photos = (c.images && c.images.length) ? c.images
                 : (c.image ? [c.image] : (p.gallery || [p.image]));
    const mainSrc = getPhotoSrc(photos[0], p.image);

    const { colors, ...rest } = p;

    return {
      ...rest,
      id: `${p.id}-${slugify(c.name)}`,
      name: `${p.name} — ${c.name}`,
      image: mainSrc,
      gallery: photos
    };
  });
}

function fetchCatalog(){
  const root = (typeof CATALOG_ROOT !== 'undefined') ? CATALOG_ROOT : '';
  const sources = [
    { file: 'data/products-totes.json',    category: 'totes' },
    { file: 'data/products-mugs.json',     category: 'mugs' },
    { file: 'data/products-stickers.json', category: 'stickers' }
  ];
  return Promise.all(
    sources.map(s =>
      fetch(root + s.file)
        .then(r => r.ok ? r.json() : { products: [] })
        .then(d => (d.products || [])
          .flatMap(p => expandProductColors(p))
          .map(p => ({ ...p, category: s.category }))
        )
        .catch(() => [])
    )
  ).then(results => results.flat());
}

/* ---------- Homepage collection tiles ---------- */
function renderHomeTiles(root){
  const TILE_ICONS = {
    totes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    mugs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 5h11v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5Z"/><path d="M15 8h2a3 3 0 0 1 0 6h-2"/></svg>',
    stickers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="8"/><path d="M9 12h6M12 9v6"/></svg>'
  };
  const tiles = {
    totes:    { countEl: 'tileTotesCount',    iconEl: 'tileTotesIcon' },
    mugs:     { countEl: 'tileMugsCount',     iconEl: 'tileMugsIcon' },
    stickers: { countEl: 'tileStickersCount', iconEl: 'tileStickersIcon' }
  };

  fetchCatalog().then(products => {
    Object.keys(tiles).forEach(cat => {
      const live = products.filter(p => p.category === cat && !p.comingSoon);
      const countEl = document.getElementById(tiles[cat].countEl);
      if(countEl){
        countEl.textContent = live.length === 0
          ? 'In design'
          : (live.length === 1 ? '1 piece available' : live.length + ' pieces available');
      }

      const tileAnchor = document.getElementById('tile' + cat.charAt(0).toUpperCase() + cat.slice(1));
      const currentImg = tileAnchor ? tileAnchor.querySelector('img.tile-photo') : null;
      const iconEl = document.getElementById(tiles[cat].iconEl);

      if(live.length > 0 && live[0].image){
        const imgSrc = (typeof root !== 'undefined' ? root : '') + getPhotoSrc(live[0].image, '');
        if(currentImg){
          currentImg.src = imgSrc;
        } else if(iconEl){
          const img = document.createElement('img');
          img.src = imgSrc;
          img.alt = cat;
          img.className = 'tile-photo';
          iconEl.replaceWith(img);
        }
      } else if(currentImg){
        const icon = document.createElement('div');
        icon.className = 'tile-icon';
        icon.id = tiles[cat].iconEl;
        icon.innerHTML = TILE_ICONS[cat];
        currentImg.replaceWith(icon);
      }
    });
  });
}

/* ---------- Collection grid page ---------- */
function renderCollectionGrid(category, root){
  const grid = document.getElementById('collectionGrid');
  const comingSoonBlock = document.getElementById('comingSoonBlock');
  if(!grid) return;

  fetchCatalog().then(products => {
    const items = products.filter(p => p.category === category);
    const live = items.filter(p => !p.comingSoon);
    const soon = items.filter(p => p.comingSoon);

    if(live.length === 0){
      grid.style.display = 'none';
      if(comingSoonBlock) comingSoonBlock.style.display = '';
      return;
    }
    if(comingSoonBlock) comingSoonBlock.style.display = 'none';
    grid.style.display = '';

    grid.innerHTML = live.map(p => `
      <div class="pg-card">
        <div class="pg-photo"><img src="${root}${getPhotoSrc(p.image, '')}" alt="${p.name}"></div>
        <div class="pg-info">
          <span class="cat">${p.category}</span>
          <h4>${p.name}</h4>
          ${p.price != null ? `<div class="price">$${p.price}</div>` : ''}
          <a href="${root}product.html?id=${encodeURIComponent(p.id)}" class="btn btn-ink">View Product</a>
        </div>
      </div>
    `).join('') + soon.map(p => `
      <div class="pg-card">
        <div class="pg-photo" style="display:flex;align-items:center;justify-content:center;color:var(--gold-deep);">
          <span style="font-size:0.8rem;letter-spacing:0.1em;text-transform:uppercase;">Coming Soon</span>
        </div>
        <div class="pg-info">
          <span class="cat">${p.category}</span>
          <h4>${p.name}</h4>
        </div>
      </div>
    `).join('');
  });
}

/* ---------- Single product template page (product.html) ---------- */
function renderProductDetail(root){
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if(!id) return;

  fetchCatalog().then(products => {
    const p = products.find(x => x.id === id);
    if(!p){
      document.getElementById('pcInfo').innerHTML = '<p>Product not found.</p>';
      return;
    }

    document.title = p.name + ' — Cubclipse';
    document.getElementById('breadcrumbName').textContent = p.name;
    document.getElementById('pcCategory').textContent = p.category;
    const catTag = document.getElementById('pcCategoryTag');
    if(catTag) catTag.textContent = p.category;
    document.getElementById('pcName').textContent = p.name;
    document.getElementById('pcPrice').textContent = p.price != null ? '$' + p.price : '';
    document.getElementById('pcDesc').textContent = p.description || '';
    document.getElementById('materialText').textContent = p.material || 'Details coming soon.';
    document.getElementById('dimensionsText').textContent = p.dimensions || 'Details coming soon.';

    const mainImg = document.getElementById('productImg');
    const gallery = document.getElementById('pcGallery');
    const dotsWrap = document.getElementById('pcDots');
    const prevBtn = document.getElementById('pcPrev');
    const nextBtn = document.getElementById('pcNext');
    const frame = mainImg.closest('.pc-media-frame');

    const photos = ((p.gallery && p.gallery.length) ? p.gallery : [p.image]).map(g => getPhotoSrc(g, p.image));
    let current = 0;

    function goTo(index){
      current = (index + photos.length) % photos.length;
      mainImg.src = root + photos[current];
      gallery.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === current));
      if(dotsWrap) dotsWrap.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === current));
    }

    gallery.innerHTML = photos.map((src, i) => `
      <div class="thumb ${i === 0 ? 'active' : ''}" data-index="${i}">
        <img src="${root}${src}" alt="${p.name} view ${i + 1}">
      </div>
    `).join('');
    gallery.querySelectorAll('.thumb').forEach(t => {
      t.addEventListener('click', () => goTo(parseInt(t.dataset.index, 10)));
    });

    if(photos.length > 1){
      if(dotsWrap){
        dotsWrap.innerHTML = photos.map((_, i) => `<div class="dot ${i===0?'active':''}"></div>`).join('');
      }
      if(prevBtn){ prevBtn.classList.remove('hidden'); prevBtn.addEventListener('click', () => goTo(current - 1)); }
      if(nextBtn){ nextBtn.classList.remove('hidden'); nextBtn.addEventListener('click', () => goTo(current + 1)); }

      if(frame){
        let touchStartX = null;
        frame.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
        frame.addEventListener('touchend', (e) => {
          if(touchStartX === null) return;
          const delta = e.changedTouches[0].clientX - touchStartX;
          if(Math.abs(delta) > 40){
            delta < 0 ? goTo(current + 1) : goTo(current - 1);
          }
          touchStartX = null;
        }, { passive: true });

        frame.setAttribute('tabindex', '0');
        frame.addEventListener('keydown', (e) => {
          if(e.key === 'ArrowLeft') goTo(current - 1);
          if(e.key === 'ArrowRight') goTo(current + 1);
        });
      }
    } else {
      if(prevBtn) prevBtn.classList.add('hidden');
      if(nextBtn) nextBtn.classList.add('hidden');
    }

    goTo(0);

    const swatchWrap = document.getElementById('pcSwatches');
    if(swatchWrap && swatchWrap.parentElement) swatchWrap.parentElement.style.display = 'none';

    const etsyBtn = document.getElementById('etsyBtn');
    if(p.etsyUrl){
      etsyBtn.href = p.etsyUrl;
      etsyBtn.style.display = '';
    } else {
      etsyBtn.style.display = 'none';
    }

    let qty = 1;
    const qtyVal = document.getElementById('qtyVal');
    const addBtn = document.getElementById('addBtn');
    function updateAddLabel(){
      addBtn.querySelector('.label-default').textContent = 'Add to Bag' + (p.price != null ? ' — $' + (p.price*qty) : '');
    }
    updateAddLabel();
    document.getElementById('qtyMinus').addEventListener('click', ()=>{
      qty = Math.max(1, qty-1); qtyVal.textContent = qty; updateAddLabel();
    });
    document.getElementById('qtyPlus').addEventListener('click', ()=>{
      qty = Math.min(9, qty+1); qtyVal.textContent = qty; updateAddLabel();
    });
    addBtn.addEventListener('click', ()=>{
      addToCart(p.id, p.name, '', p.price || 0, qty, mainImg.src);
      addBtn.classList.add('added');
      setTimeout(()=> addBtn.classList.remove('added'), 2200);
    });
  });
}

/* ---------- Accordion (material / dimensions / shipping) — shared ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pc-detail-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const item = btn.parentElement;
      const panel = document.getElementById(btn.dataset.target);
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.pc-detail-item').forEach(i=>{
        i.classList.remove('open');
        i.querySelector('.pc-detail-panel').style.maxHeight = null;
      });
      if(!isOpen){
        item.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });
});

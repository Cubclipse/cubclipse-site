/* =====================================================================
   CUBCLIPSE CATALOG — reads /data/products.json (edited via /admin CMS)
   and renders:
     - collection grids (collections/totes.html, mugs.html, stickers.html)
     - the single product template (product.html?id=...)
   Include this AFTER cart.js on any page that needs it.
   ===================================================================== */

function fetchCatalog(){
  // "root" is set per-page as a global before this script loads,
  // e.g. const CATALOG_ROOT = '../'; for pages inside /collections/ or /products/
  const root = (typeof CATALOG_ROOT !== 'undefined') ? CATALOG_ROOT : '';
  return fetch(root + 'data/products.json').then(r => r.json()).then(d => d.products || []);
}

/* ---------- Homepage collection tiles (keeps counts/photos in sync with real data) ---------- */
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
        // Show the real product photo
        const imgSrc = (typeof root !== 'undefined' ? root : '') + live[0].image;
        if(currentImg){
          currentImg.src = imgSrc; // already showing a photo, just update it
        } else if(iconEl){
          const img = document.createElement('img');
          img.src = imgSrc;
          img.alt = cat;
          img.className = 'tile-photo';
          iconEl.replaceWith(img);
        }
      } else if(currentImg){
        // No live product anymore — revert back to this category's own icon
        const icon = document.createElement('div');
        icon.className = 'tile-icon';
        icon.id = tiles[cat].iconEl;
        icon.innerHTML = TILE_ICONS[cat];
        currentImg.replaceWith(icon);
      }
    });
  });
}

/* ---------- Collection grid page (e.g. collections/totes.html) ---------- */
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
        <div class="pg-photo"><img src="${root}${p.image}" alt="${p.name}"></div>
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
    mainImg.src = root + p.image;
    mainImg.alt = p.name;

    // Gallery thumbnails (real photos, click to swap main image)
    const gallery = document.getElementById('pcGallery');
    const photos = (p.gallery && p.gallery.length) ? p.gallery : [{src: p.image}];
    gallery.innerHTML = photos.map((g, i) => `
      <div class="thumb ${i===0 ? 'active' : ''}" data-src="${root}${g.src}">
        <img src="${root}${g.src}" alt="${p.name} view ${i+1}">
      </div>
    `).join('');
    gallery.querySelectorAll('.thumb').forEach(t => {
      t.addEventListener('click', () => {
        gallery.querySelectorAll('.thumb').forEach(x=>x.classList.remove('active'));
        t.classList.add('active');
        mainImg.src = t.dataset.src;
      });
    });

    // Color swatches — real photo per variant, not a filter
    const swatchWrap = document.getElementById('pcSwatches');
    const colorLabel = document.getElementById('colorName');
    if(p.colors && p.colors.length > 1){
      swatchWrap.innerHTML = p.colors.map((c, i) => `
        <button class="swatch ${i===0 ? 'active' : ''}" data-image="${root}${c.image}" data-name="${c.name}" title="${c.name}" style="background:#ccc;"></button>
      `).join('');
      colorLabel.textContent = p.colors[0].name;
      swatchWrap.querySelectorAll('.swatch').forEach(sw => {
        sw.addEventListener('click', () => {
          swatchWrap.querySelectorAll('.swatch').forEach(s=>s.classList.remove('active'));
          sw.classList.add('active');
          mainImg.src = sw.dataset.image;
          colorLabel.textContent = sw.dataset.name;
        });
      });
      swatchWrap.parentElement.style.display = '';
    } else if(swatchWrap){
      swatchWrap.parentElement.style.display = 'none';
    }

    // Etsy button
    const etsyBtn = document.getElementById('etsyBtn');
    if(p.etsyUrl){
      etsyBtn.href = p.etsyUrl;
      etsyBtn.style.display = '';
    } else {
      etsyBtn.style.display = 'none';
    }

    // Add to bag
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
      const currentColor = colorLabel ? colorLabel.textContent : '';
      addToCart(p.id, p.name, currentColor, p.price || 0, qty, mainImg.src);
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

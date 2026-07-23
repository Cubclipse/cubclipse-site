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

    // Odstraní 'colors' z výsledného objektu, ať se do něj UI/logika dál nezaplétá
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

    const photos = (p.gallery && p.gallery.length) ? p.gallery : [p.image];
    gallery.innerHTML = photos.map((g, i) => {
      const imgSrc = getPhotoSrc(g, p.image);
      return `
        <div class="thumb ${i === 0 ? 'active' : ''}" data-src="${root}${imgSrc}">
          <img src="${root}${imgSrc}" alt="${p.name} view ${i + 1}">
        </div>
      `;
    }).join('');

    mainImg.src = root + getPhotoSrc(photos[0], p.image);
    mainImg.alt = p.name;

    gallery.querySelectorAll('.thumb').forEach(t => {
      t.addEventListener('click', () => {
        gallery.querySelectorAll('.thumb').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        mainImg.src = t.dataset.src;
      });
    });

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

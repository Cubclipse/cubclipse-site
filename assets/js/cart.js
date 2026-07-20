/* =====================================================================
   CUBCLIPSE CART — shared across every page via localStorage.
   Include this file on every page (after the DOM, before your own
   inline script) and it wires up:
     - the nav bag icon + count
     - the slide-out cart drawer
     - addToCart() / changeCartQty() / removeFromCart()
     - a toast helper: showToast(message)
   ===================================================================== */

function getCart(){
  try{
    return JSON.parse(localStorage.getItem('cubclipse_cart') || '[]');
  }catch(e){ return []; }
}
function saveCart(cart){
  localStorage.setItem('cubclipse_cart', JSON.stringify(cart));
  renderCart();
}

function addToCart(id, name, color, price, qtyToAdd, image){
  const cart = getCart();
  const existing = cart.find(i => i.id===id && i.color===color);
  if(existing){ existing.qty += qtyToAdd; }
  else { cart.push({id, name, color, price, qty:qtyToAdd, image}); }
  saveCart(cart);
  showToast(`${qtyToAdd} × ${name}${color ? ' ('+color+')' : ''} added to your bag ✓`);
}

function changeCartQty(index, delta){
  const cart = getCart();
  cart[index].qty += delta;
  if(cart[index].qty <= 0) cart.splice(index,1);
  saveCart(cart);
}
function removeFromCart(index){
  const cart = getCart();
  cart.splice(index,1);
  saveCart(cart);
}

function renderCart(){
  const cart = getCart();
  const wrap = document.getElementById('cartItems');
  const bagCountEl = document.getElementById('bagCount');
  if(!wrap || !bagCountEl) return;

  const totalQty = cart.reduce((s,i)=>s+i.qty, 0);
  bagCountEl.textContent = totalQty;

  if(cart.length === 0){
    wrap.innerHTML = `<div class="cart-empty"><span>🦊</span>Your bag is empty.<br>Go find something to curl up with.</div>`;
  } else {
    wrap.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}">
        <div class="ci-info">
          <h4>${item.name}</h4>
          ${item.color ? `<div class="ci-color">${item.color}</div>` : ''}
          <div class="ci-row">
            <div class="ci-qty">
              <button onclick="changeCartQty(${i}, -1)">−</button>
              <span>${item.qty}</span>
              <button onclick="changeCartQty(${i}, 1)">+</button>
            </div>
            <span class="ci-price">$${item.price * item.qty}</span>
          </div>
          <button class="ci-remove" onclick="removeFromCart(${i})">Remove</button>
        </div>
      </div>
    `).join('');
  }

  const subtotal = cart.reduce((s,i)=> s + i.price*i.qty, 0);
  const subEl = document.getElementById('cartSubtotal');
  if(subEl) subEl.textContent = '$' + subtotal;
}

function showToast(msg){
  const toast = document.getElementById('toast');
  if(!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=> toast.classList.remove('show'), 2200);
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  const nav = document.getElementById('mainNav');
  if(nav){
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartOverlay');
  const navBag = document.getElementById('navBag');
  const cartClose = document.getElementById('cartClose');
  function openCart(){ cartDrawer.classList.add('show'); cartOverlay.classList.add('show'); }
  function closeCart(){ cartDrawer.classList.remove('show'); cartOverlay.classList.remove('show'); }
  if(navBag) navBag.addEventListener('click', openCart);
  if(cartClose) cartClose.addEventListener('click', closeCart);
  if(cartOverlay) cartOverlay.addEventListener('click', closeCart);

  const checkoutBtn = document.getElementById('checkoutBtn');
  if(checkoutBtn){
    checkoutBtn.addEventListener('click', ()=>{
      if(getCart().length === 0){ showToast('Your bag is empty — add something first 🦊'); return; }
      showToast('Checkout would continue to payment here — connect Stripe, Shopify, or Etsy to go live.');
    });
  }

  document.querySelectorAll('.news-form, .notify-form').forEach(form=>{
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const msg = form.parentElement.querySelector('.news-msg, .notify-msg');
      if(msg) msg.classList.add('show');
      form.reset();
    });
  });
});

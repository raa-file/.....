/* HANGR — app */
(function () {
  'use strict';
  const { PRODUCTS, CATEGORIES, garment, HOOK } = window.HANGR;
  const $ = (s, r = document) => r.querySelector(s);
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const fmt = (n) => `SAR ${n.toLocaleString('en-US')}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SIZES = ['S', 'M', 'L', 'XL'];

  /* ---------- storage (safe) ---------- */
  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };

  const state = {
    cat: 'all',
    q: '',
    cart: store.get('hangr-cart', []).filter((l) => byId[l.id]),
    user: store.get('hangr-user', null),
  };

  const mqMobile = matchMedia('(max-width: 759px)');
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(hover: none)');
  let mobile = mqMobile.matches;

  /* =========================================================
     Categories
     ========================================================= */
  function renderCats() {
    $('#cats').innerHTML = CATEGORIES.map((c) => {
      const n = c.id === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.cat === c.id).length;
      return `<button data-cat="${c.id}" aria-current="${c.id === state.cat}">${c.label}<span>${n}</span></button>`;
    }).join('');
  }
  $('#cats').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]');
    if (!b || b.dataset.cat === state.cat) return;
    state.cat = b.dataset.cat;
    renderCats();
    swapRack();
  });

  function visible() {
    const q = state.q.trim().toLowerCase();
    return PRODUCTS.filter((p) =>
      (state.cat === 'all' || p.cat === state.cat) &&
      (!q || `${p.name} ${p.color}`.toLowerCase().includes(q)));
  }

  /* =========================================================
     Rack rendering
     ========================================================= */
  const items = [];
  const rack = $('#rack');

  function swapRack() {
    if (mqReduce.matches) { renderRack(false); return; }
    rack.classList.add('leaving');
    $('#rackTitle').style.opacity = 0;
    setTimeout(() => { rack.classList.remove('leaving'); renderRack(true); $('#rackTitle').style.opacity = 1; }, 210);
  }

  function renderRack(animate) {
    const list = visible();
    items.length = 0;
    rack.innerHTML = '';
    const cat = CATEGORIES.find((c) => c.id === state.cat);
    $('#rackTitle').textContent = cat.id === 'all' ? 'All pieces' : cat.label;
    $('#rackCount').textContent = `${list.length} ${list.length === 1 ? 'piece' : 'pieces'}`;

    if (!list.length) {
      rack.innerHTML = `<div class="empty"><p>Nothing on this rail matches “${esc(state.q)}”.</p><button class="link" id="clearSearch">Clear search</button></div>`;
      $('#clearSearch').onclick = () => { $('#searchInput').value = ''; state.q = ''; renderRack(true); };
      updateArrows();
      return;
    }

    const per = mobile ? 2 : list.length;
    let idx = 0;
    for (let i = 0; i < list.length; i += per) {
      const rail = document.createElement('div');
      rail.className = 'rail';
      rail.innerHTML = '<div class="rail-inner"><div class="pipe" aria-hidden="true"><span class="cap l"></span><span class="cap r"></span></div><div class="hangers"></div></div>';
      const hangers = rail.querySelector('.hangers');
      const railItems = [];
      list.slice(i, i + per).forEach((p) => {
        const it = makeItem(p, idx++, animate, rail);
        hangers.appendChild(it.el);
        railItems.push(it);
      });
      railItems.forEach((it, k) => { it.prev = railItems[k - 1]; it.next = railItems[k + 1]; });
      rack.appendChild(rail);
      if (!mobile) wireRailScroll(rail);
    }
    updateArrows();
  }

  function makeItem(p, idx, animate, rail) {
    const el = document.createElement('div');
    el.className = 'item' + (animate && !mqReduce.matches ? ' drop' : '');
    el.style.setProperty('--d', `${idx * 55}ms`);
    el.innerHTML = `
      <div class="hit" role="button" tabindex="0" aria-label="${esc(p.name)}, ${fmt(p.price)}. Open details">
        <div class="swing"><div class="spin">
          ${HOOK}
          <div class="face front">${garment(p, 'front', `${p.id}-f`)}</div>
          <div class="face back">${garment(p, 'back', `${p.id}-b`)}</div>
        </div></div>
        <span class="tag-focus" aria-hidden="true"></span>
      </div>
      <div class="tag"><span class="tag-name">${esc(p.name)}</span><span class="tag-price">${fmt(p.price)}</span></div>`;

    const it = {
      p, el, rail,
      hit: el.querySelector('.hit'),
      swing: el.querySelector('.swing'),
      spin: el.querySelector('.spin'),
      shades: el.querySelectorAll('.shade'),
      name: el.querySelector('.tag-name'),
      rot: 0, vel: 0, target: 0, mode: 'idle',
      sway: animate ? (idx % 2 ? 7 : -7) : 0, swayVel: 0,
      phase: idx * 1.37, hover: false, armedUntil: 0,
      last: { sway: NaN, rot: NaN, sh: NaN },
    };
    bindItem(it);
    items.push(it);
    return it;
  }

  /* =========================================================
     Interaction on a hanging piece
     ========================================================= */
  function startSpin(it) {
    if (it.mode === 'drag') return;
    it.hover = true;
    it.mode = 'spin';
    it.swayVel += (Math.random() > 0.5 ? 1 : -1) * 16;
    if (it.prev) it.prev.swayVel -= 7;
    if (it.next) it.next.swayVel += 7;
    bumpRail(it.rail);
  }
  function stopSpin(it) {
    it.hover = false;
    if (it.mode !== 'spin') return;
    const r = ((it.rot % 360) + 360) % 360;
    it.target = r < 30 ? it.rot - r : it.rot + (360 - r); // finish the turn, land on the front
    it.mode = 'settle';
  }
  function turnOnce(it) {
    it.target = Math.round(it.rot / 360) * 360 + 360;
    it.mode = 'settle';
    it.swayVel += 12;
    bumpRail(it.rail);
  }

  let bumpAt = 0;
  function bumpRail(rail) {
    if (mqReduce.matches) return;
    const now = performance.now();
    if (now - bumpAt < 380) return;
    bumpAt = now;
    const inner = rail.querySelector('.rail-inner');
    inner.classList.remove('bump');
    void inner.offsetWidth;
    inner.classList.add('bump');
  }

  function bindItem(it) {
    const h = it.hit;
    let down = null;

    h.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') startSpin(it); });
    h.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && it.mode !== 'drag') stopSpin(it); });

    h.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, rot: it.rot, t: performance.now(), lastX: e.clientX, lastT: performance.now(), v: 0, moved: false, type: e.pointerType, id: e.pointerId };
    });
    h.addEventListener('pointermove', (e) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved) {
        if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)) return;
        // horizontal drag rotates the piece (only where the page isn't using that gesture)
        if (down.type !== 'mouse' && !mobile) { down = null; return; }
        down.moved = true;
        it.mode = 'drag';
        try { h.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      const now = performance.now();
      it.rot = down.rot + dx * 0.9;
      down.v = ((e.clientX - down.lastX) * 0.9) / Math.max(0.008, (now - down.lastT) / 1000);
      down.lastX = e.clientX; down.lastT = now;
    });
    const end = (e) => {
      if (!down || e.pointerId !== down.id) return;
      const d = down; down = null;
      if (d.moved) {
        it.vel = Math.max(-900, Math.min(900, d.v));
        it.target = Math.round((it.rot + it.vel * 0.22) / 180) * 180; // rest on front or back
        it.mode = 'settle';
        if (d.type === 'mouse' && it.hover) setTimeout(() => { if (it.hover && it.mode === 'idle') startSpin(it); }, 1400);
        return;
      }
      if (e.type === 'pointercancel') return;
      if (d.type === 'mouse') { openModal(it.p, h); return; }
      // touch / pen: first tap turns the piece, second tap opens it
      const now = performance.now();
      if (now < it.armedUntil) { it.armedUntil = 0; openModal(it.p, h); return; }
      turnOnce(it);
      it.armedUntil = now + 4000;
      flashName(it);
    };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);

    h.addEventListener('focus', () => { if (h.matches(':focus-visible')) startSpin(it); });
    h.addEventListener('blur', () => stopSpin(it));
    h.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(it.p, h); }
    });
  }

  function flashName(it) {
    const n = it.name;
    n.textContent = 'Tap again for details';
    n.classList.add('flash');
    clearTimeout(it.flashT);
    it.flashT = setTimeout(() => { n.textContent = it.p.name; n.classList.remove('flash'); }, 2600);
  }

  /* =========================================================
     Motion loop — spin, settle, sway
     ========================================================= */
  let lastT = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const t = now / 1000;
    const rm = mqReduce.matches;

    for (const it of items) {
      if (it.mode === 'spin') {
        const sp = rm ? 80 : 165;
        it.vel += (sp - it.vel) * Math.min(1, dt * 2.6);
        it.rot += it.vel * dt;
      } else if (it.mode === 'settle') {
        const diff = it.target - it.rot;
        const acc = rm ? 500 : 300;
        const maxV = rm ? 420 : 280;
        const want = Math.sign(diff) * Math.min(maxV, Math.sqrt(2 * acc * Math.abs(diff)));
        it.vel += (want - it.vel) * Math.min(1, dt * 7);
        it.rot += it.vel * dt;
        if (Math.abs(diff) < 0.25 && Math.abs(it.vel) < 6) {
          it.rot = ((it.target % 360) + 360) % 360;
          it.target = it.rot; it.vel = 0; it.mode = 'idle';
        }
      }

      // pendulum sway around the hook
      let base = 0;
      if (!rm) {
        base = Math.sin(t * 1.05 + it.phase) * 0.8;
        if (it.mode === 'spin') base += Math.sin(t * 2.7 + it.phase) * 1.3;
      }
      it.swayVel += (19 * (base - it.sway) - 1.7 * it.swayVel) * dt;
      it.sway += it.swayVel * dt;

      // write only what changed
      const L = it.last;
      if (Math.abs(L.sway - it.sway) > 0.004 || isNaN(L.sway)) {
        it.swing.style.transform = `rotate(${it.sway.toFixed(3)}deg)`;
        L.sway = it.sway;
      }
      if (L.rot !== it.rot) {
        it.spin.style.transform = `rotateY(${it.rot.toFixed(2)}deg)`;
        L.rot = it.rot;
        const sh = +((1 - Math.abs(Math.cos((it.rot * Math.PI) / 180))) * 0.5).toFixed(3);
        if (sh !== L.sh) { it.shades.forEach((s) => s.setAttribute('opacity', sh)); L.sh = sh; }
      }
    }
    requestAnimationFrame(tick);
  }

  /* =========================================================
     Desktop rail scrolling
     ========================================================= */
  function mainRail() { return rack.querySelector('.rail'); }
  function wireRailScroll(rail) {
    rail.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = rail.scrollWidth - rail.clientWidth;
      if (max <= 0) return;
      if ((e.deltaY < 0 && rail.scrollLeft <= 0) || (e.deltaY > 0 && rail.scrollLeft >= max - 1)) return;
      e.preventDefault();
      rail.scrollLeft += e.deltaY;
    }, { passive: false });
    rail.addEventListener('scroll', updateArrows, { passive: true });
  }
  function updateArrows() {
    const r = mainRail();
    const prev = $('#prevBtn'), next = $('#nextBtn');
    if (!r || mobile) { prev.disabled = next.disabled = true; return; }
    const max = r.scrollWidth - r.clientWidth;
    prev.disabled = r.scrollLeft <= 2;
    next.disabled = r.scrollLeft >= max - 2;
    $('.rail-nav').style.visibility = max > 2 ? 'visible' : 'hidden';
  }
  const step = (dir) => { const r = mainRail(); if (r) r.scrollBy({ left: dir * 3 * 206, behavior: mqReduce.matches ? 'auto' : 'smooth' }); };
  $('#prevBtn').onclick = () => step(-1);
  $('#nextBtn').onclick = () => step(1);

  mqMobile.addEventListener('change', () => { mobile = mqMobile.matches; renderRack(false); setHint(); });
  window.addEventListener('resize', updateArrows);

  function setHint() {
    $('#hint').textContent = coarse.matches
      ? (mobile ? 'Tap a piece to turn it, tap again for details. Swipe sideways to spin it by hand.' : 'Tap a piece to turn it, tap again for details.')
      : 'Hover over a piece to turn it. Click to see it up close, or drag to spin it by hand.';
  }

  /* =========================================================
     Product details
     ========================================================= */
  const modal = $('#modal');
  const m = { p: null, size: 'M', qty: 1, rot: 0, opener: null };

  function openModal(p, opener) {
    m.p = p; m.size = 'M'; m.qty = 1; m.rot = 0; m.opener = opener || null;
    $('#vFront').innerHTML = garment(p, 'front', `m-${p.id}-f`);
    $('#vBack').innerHTML = garment(p, 'back', `m-${p.id}-b`);
    $('#mName').textContent = p.name;
    $('#mPrice').textContent = fmt(p.price);
    $('#mColor').textContent = p.color;
    $('#mDot').style.background = p.hex;
    $('#mDesc').textContent = p.desc;
    renderSizes();
    $('#qVal').textContent = 1;
    setModalRot(0, false);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.close', modal).focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (m.opener) m.opener.focus({ preventScroll: true });
  }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });

  function renderSizes() {
    $('#sizeRow').setAttribute('role', 'radiogroup');
    $('#sizeRow').setAttribute('aria-label', 'Size');
    $('#sizeRow').innerHTML = SIZES.map((s) => `<button role="radio" aria-checked="${s === m.size}" data-size="${s}">${s}</button>`).join('');
  }
  $('#sizeRow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    m.size = b.dataset.size;
    renderSizes();
    $(`[data-size="${m.size}"]`, $('#sizeRow')).focus();
  });
  $('#qMinus').onclick = () => { m.qty = Math.max(1, m.qty - 1); $('#qVal').textContent = m.qty; };
  $('#qPlus').onclick = () => { m.qty = Math.min(10, m.qty + 1); $('#qVal').textContent = m.qty; };

  function setModalRot(deg, animate = true) {
    m.rot = deg;
    const s = $('#vSpin');
    s.classList.toggle('dragging', !animate);
    s.style.transform = `rotateY(${deg}deg)`;
    const back = Math.round(deg / 180) % 2 !== 0;
    document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.side === 'back') === back)));
  }
  document.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-side]');
    if (!b) return;
    const wantBack = b.dataset.side === 'back';
    const isBack = Math.round(m.rot / 180) % 2 !== 0;
    if (wantBack !== isBack) setModalRot(m.rot + 180);
  });

  // drag to turn in the viewer
  (function () {
    const stage = $('#vStage');
    let d = null;
    stage.addEventListener('pointerdown', (e) => { d = { x: e.clientX, y: e.clientY, rot: m.rot, id: e.pointerId, moved: false }; });
    stage.addEventListener('pointermove', (e) => {
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x;
      if (!d.moved) {
        if (Math.abs(dx) < 5 || Math.abs(dx) < Math.abs(e.clientY - d.y)) return;
        d.moved = true;
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      setModalRot(d.rot + dx * 0.7, false);
    });
    const end = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const moved = d.moved; d = null;
      if (moved) requestAnimationFrame(() => setModalRot(Math.round(m.rot / 180) * 180, true));
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
  })();

  $('#addBtn').onclick = () => {
    addToCart(m.p.id, m.size, m.qty);
    toast(`Added ${m.qty > 1 ? m.qty + ' × ' : ''}${m.p.name} (${m.size}) to cart`);
    closeModal();
  };

  /* =========================================================
     Cart
     ========================================================= */
  const cartWrap = $('#cartWrap');
  function saveCart() { store.set('hangr-cart', state.cart); }
  function cartCount() { return state.cart.reduce((n, l) => n + l.qty, 0); }

  function addToCart(id, size, qty) {
    const line = state.cart.find((l) => l.id === id && l.size === size);
    if (line) line.qty = Math.min(20, line.qty + qty);
    else state.cart.push({ id, size, qty });
    saveCart();
    renderBadge(true);
    renderCart();
  }

  function renderBadge(pop) {
    const n = cartCount(), b = $('#badge');
    b.hidden = n === 0;
    b.textContent = n;
    $('#cartBtn').setAttribute('aria-label', `Cart, ${n} ${n === 1 ? 'item' : 'items'}`);
    if (pop && !mqReduce.matches) { b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce'); }
  }

  function renderCart() {
    const lines = $('#lines');
    const empty = state.cart.length === 0;
    $('#cartEmpty').hidden = !empty;
    $('#cartFoot').hidden = empty;
    lines.hidden = empty;
    $('#cartTitle').textContent = empty ? 'Cart' : `Cart (${cartCount()})`;
    lines.innerHTML = state.cart.map((l, i) => {
      const p = byId[l.id];
      return `<li class="line" data-i="${i}">
        <div class="line-thumb">${garment(p, 'front', `c-${p.id}-${l.size}`)}</div>
        <div>
          <p class="line-name">${esc(p.name)}</p>
          <p class="line-meta">${esc(p.color)} · Size ${l.size}</p>
          <div class="stepper sm" role="group" aria-label="Quantity for ${esc(p.name)} size ${l.size}">
            <button data-act="dec" aria-label="Decrease">−</button><output>${l.qty}</output><button data-act="inc" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="line-right">
          <span class="line-price">${fmt(p.price * l.qty)}</span>
          <button class="remove" data-act="rm">Remove</button>
        </div>
      </li>`;
    }).join('');
    const sub = state.cart.reduce((s, l) => s + byId[l.id].price * l.qty, 0);
    $('#subtotal').textContent = fmt(sub);
  }

  $('#lines').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const i = +b.closest('.line').dataset.i, l = state.cart[i];
    if (b.dataset.act === 'inc') l.qty = Math.min(20, l.qty + 1);
    if (b.dataset.act === 'dec') { l.qty -= 1; if (l.qty < 1) state.cart.splice(i, 1); }
    if (b.dataset.act === 'rm') { state.cart.splice(i, 1); toast(`Removed ${byId[l.id].name}`); }
    saveCart(); renderCart(); renderBadge(false);
    const again = $(`.line[data-i="${i}"] [data-act="${b.dataset.act}"]`);
    if (again) again.focus(); else $('[data-cart-close].icon-btn').focus();
  });

  function openCart() {
    restoreCartView();
    renderCart();
    cartWrap.hidden = false;
    document.body.style.overflow = 'hidden';
    $('[data-cart-close].icon-btn').focus();
  }
  function closeCart() {
    cartWrap.hidden = true;
    document.body.style.overflow = '';
    $('#cartBtn').focus({ preventScroll: true });
  }
  $('#cartBtn').onclick = openCart;
  cartWrap.addEventListener('click', (e) => { if (e.target.closest('[data-cart-close]')) closeCart(); });

  $('#checkoutBtn').onclick = () => {
    const n = cartCount();
    state.cart = []; saveCart(); renderBadge(false);
    $('#lines').hidden = true; $('#cartFoot').hidden = true; $('#cartEmpty').hidden = true;
    const done = document.createElement('div');
    done.className = 'done';
    done.innerHTML = `<h3>Order placed</h3><p>${n} ${n === 1 ? 'piece is' : 'pieces are'} on the way. This is a demo store, so nothing was charged.</p><button class="btn" data-cart-close>Back to the rail</button>`;
    $('#cart').appendChild(done);
    $('#cartTitle').textContent = 'Cart';
  };
  function restoreCartView() { const d = $('#cart .done'); if (d) d.remove(); }

  /* =========================================================
     Search
     ========================================================= */
  const searchBar = $('#searchBar'), searchInput = $('#searchInput');
  $('#searchBtn').onclick = () => {
    const open = searchBar.hidden;
    searchBar.hidden = !open;
    $('#searchBtn').setAttribute('aria-expanded', String(open));
    if (open) searchInput.focus();
    else if (state.q) { searchInput.value = ''; state.q = ''; renderRack(true); }
  };
  let qT;
  searchInput.addEventListener('input', () => {
    clearTimeout(qT);
    qT = setTimeout(() => { state.q = searchInput.value; renderRack(true); }, 160);
  });

  /* =========================================================
     Account (local demo)
     ========================================================= */
  const pop = $('#accountPop');
  function renderAccount() {
    const u = state.user;
    const ini = $('#initial');
    ini.hidden = !u;
    if (u) ini.textContent = u.charAt(0).toUpperCase();
    pop.innerHTML = u
      ? `<h3>Hi, ${esc(u)}</h3><p>You're signed in on this device.</p><button class="btn" id="signOut" style="width:100%">Sign out</button>`
      : `<h3>Sign in</h3><p>Demo account. Your name stays on this device.</p><label class="sr" for="nameIn">Your name</label><input id="nameIn" placeholder="Your name" autocomplete="given-name"><button class="btn primary" id="signIn">Sign in</button>`;
    const si = $('#signIn', pop), so = $('#signOut', pop), ni = $('#nameIn', pop);
    if (si) {
      const go = () => { const v = ni.value.trim(); if (!v) { ni.focus(); return; } state.user = v; store.set('hangr-user', v); renderAccount(); toast(`Signed in as ${v}`); togglePop(false); };
      si.onclick = go;
      ni.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    }
    if (so) so.onclick = () => { state.user = null; store.set('hangr-user', null); renderAccount(); toast('Signed out'); togglePop(false); };
  }
  function togglePop(force) {
    const open = force != null ? force : pop.hidden;
    pop.hidden = !open;
    $('#accountBtn').setAttribute('aria-expanded', String(open));
    if (open) { const f = $('input, button', pop); if (f) f.focus(); }
  }
  $('#accountBtn').onclick = (e) => { e.stopPropagation(); togglePop(); };
  document.addEventListener('click', (e) => { if (!pop.hidden && !e.target.closest('.account-wrap')) togglePop(false); });

  /* =========================================================
     Toast, keyboard
     ========================================================= */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeModal();
    else if (!cartWrap.hidden) closeCart();
    else if (!pop.hidden) togglePop(false);
    else if (!searchBar.hidden) $('#searchBtn').click();
  });

  /* ---------- go ---------- */
  renderCats();
  renderRack(true);
  renderBadge(false);
  renderCart();
  renderAccount();
  setHint();
  requestAnimationFrame(tick);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateArrows);
})();

/* ============================================================
   Cesia's Truck — client island
   Language switch (auto-detect + persist), build-your-order, the
   right-side order drawer, the pickup-time → SMS flow, and the menu
   board's category tabs.

   Reads its data from <script type="application/json" id="cesia-data">.
   ============================================================ */

const FALLBACK_SMS = '+17147106159';

const money = (n) => '$' + Number(n).toFixed(2);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

/* tiny inline icons used by the JS-rendered drawer */
const ICON = {
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
};

export function initCesia() {
  const dataEl = document.getElementById('cesia-data');
  if (!dataEl) return;
  let data;
  try {
    data = JSON.parse(dataEl.textContent || '{}');
  } catch {
    return;
  }
  const I18N = data.i18n || { en: {}, es: {} };
  const ITEMS = data.items || {};
  const SMS_NUMBER = data.smsNumber || FALLBACK_SMS;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let lang = 'en';
  let order = {};
  let pickupKey = 'asap';
  let pickupOpts = [];

  const t = (k) => (I18N[lang] && I18N[lang][k]) ?? (I18N.en && I18N.en[k]) ?? k;

  /* ---------- persistence ---------- */
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
  const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const saveOrder = () => save('cesia_order', JSON.stringify(order));

  /* ---------- i18n ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => {
      const v = t(el.getAttribute('data-i18n'));
      if (v != null) el.textContent = v;
    });
    $$('[data-en]').forEach((el) => {
      const v = el.getAttribute(lang === 'es' ? 'data-es' : 'data-en');
      if (v != null) el.textContent = v;
    });
    $$('.lang-toggle button[data-lang]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)),
    );
    if (isSheetOpen()) renderSheet();
    updateCount();
  }
  function setLang(l) {
    lang = l;
    save('cesia_lang', l);
    applyLang();
  }

  /* ---------- order state ---------- */
  const orderCount = () => Object.values(order).reduce((a, b) => a + b, 0);
  const orderTotal = () =>
    Object.entries(order).reduce((s, [id, q]) => s + (ITEMS[id] ? ITEMS[id].price * q : 0), 0);

  function bumpOrderBtn() {
    const b = $('.order-btn');
    if (!b) return;
    b.classList.remove('bump');
    void b.offsetWidth; /* reflow so the animation can replay */
    b.classList.add('bump');
  }
  function addItem(id) {
    if (!ITEMS[id]) return;
    order[id] = (order[id] || 0) + 1;
    saveOrder();
    updateCount();
    bumpOrderBtn();
  }
  function setQty(id, delta) {
    order[id] = (order[id] || 0) + delta;
    if (order[id] <= 0) delete order[id];
    saveOrder();
    updateCount();
    renderSheet();
  }
  function clearOrder() {
    order = {};
    saveOrder();
    updateCount();
    renderSheet();
  }

  function updateCount() {
    const c = orderCount();
    const el = $('#order-count');
    if (el) el.textContent = c > 0 ? ` · ${c}` : '';
  }

  /* ---------- pickup times ---------- */
  function buildPickupOpts() {
    const opts = [{ key: 'asap', label: t('pickup.asap') }];
    const now = new Date();
    [20, 30, 45, 60].forEach((min) => {
      const d = new Date(now.getTime() + min * 60000);
      let h = d.getHours();
      let m = Math.ceil(d.getMinutes() / 5) * 5;
      if (m >= 60) { m -= 60; h = (h + 1) % 24; }
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      opts.push({ key: String(min), label: `${h12}:${String(m).padStart(2, '0')} ${ampm}` });
    });
    return opts;
  }
  const pickupLabel = () => {
    const o = pickupOpts.find((x) => x.key === pickupKey);
    return o ? o.label : t('pickup.asap');
  };

  /* ---------- order drawer ---------- */
  const sheet = () => $('#sheet');
  const scrim = () => $('#scrim');
  const isSheetOpen = () => !!sheet() && sheet().classList.contains('is-open');

  function openSheet() {
    pickupOpts = buildPickupOpts();
    if (!pickupOpts.some((o) => o.key === pickupKey)) pickupKey = 'asap';
    renderSheet();
    scrim().classList.add('is-open');
    sheet().classList.add('is-open');
    sheet().setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const close = $('#sheet-close');
    if (close) close.focus();
  }
  function closeSheet() {
    scrim().classList.remove('is-open');
    sheet().classList.remove('is-open');
    sheet().setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    const btn = $('.order-btn');
    if (btn) btn.focus();
  }

  function smsHref() {
    const lines = Object.entries(order).map(([id, q]) => {
      const it = ITEMS[id];
      return `- ${q}x ${it ? it.name : id} (${money(it ? it.price : 0)})`;
    });
    const body = [
      t('sms.intro'),
      lines.join('\n'),
      '',
      `${t('pickup.smsLabel')}: ${pickupLabel()}`,
      `${t('order.subtotal')}: ${money(orderTotal())} (${t('footer.ptax')})`,
      t('sms.outro'),
    ].join('\n');
    return `sms:${SMS_NUMBER}?&body=${encodeURIComponent(body)}`;
  }

  function renderSheet() {
    const body = $('#sheet-body');
    const foot = $('#sheet-foot');
    if (!body || !foot) return;
    const ids = Object.keys(order);

    if (ids.length === 0) {
      body.innerHTML = `<div class="sheet-empty">${ICON.bag}<p>${esc(t('order.empty'))}</p></div>`;
      foot.innerHTML = '';
      return;
    }

    body.innerHTML = ids
      .map((id) => {
        const it = ITEMS[id];
        const name = it ? it.name : id;
        const price = it ? it.price : 0;
        const q = order[id];
        return `<div class="si">
          <div class="si-main">
            <div class="si-name">${esc(name)}</div>
            <div class="si-price">${money(price)} × ${q} = ${money(price * q)}</div>
          </div>
          <div class="stepper">
            <button type="button" class="stepper__btn" data-act="dec" data-id="${esc(id)}" aria-label="${esc(t('a11y.less'))} ${esc(name)}">${ICON.minus}</button>
            <span class="stepper__q">${q}</span>
            <button type="button" class="stepper__btn" data-act="inc" data-id="${esc(id)}" aria-label="${esc(t('a11y.more'))} ${esc(name)}">${ICON.plus}</button>
          </div>
        </div>`;
      })
      .join('');

    foot.innerHTML = `
      <div class="sub-row">
        <span class="sub-row__l">${esc(t('order.subtotal'))}</span>
        <span class="sub-row__v">${money(orderTotal())}</span>
      </div>
      <div class="pickup">
        <div class="pickup__lbl">${esc(t('pickup.label'))}</div>
        <div class="pickup__chips">
          ${pickupOpts
            .map(
              (o) =>
                `<button type="button" class="pchip" data-pickup="${esc(o.key)}" aria-pressed="${o.key === pickupKey}">${esc(o.label)}</button>`,
            )
            .join('')}
        </div>
      </div>
      <p class="est-note">${esc(t('order.note'))}</p>
      <a class="btn btn--accent btn--block" id="send-btn" href="${smsHref()}">${ICON.send}<span>${esc(t('order.send'))}</span></a>
      <button type="button" class="clear-btn" data-act="clear">${esc(t('order.clear'))}</button>`;
  }

  /* ---------- menu board: category tabs ---------- */
  function setBoardTab(id) {
    $$('[data-board-tab]').forEach((tab) =>
      tab.setAttribute('aria-selected', String(tab.getAttribute('data-board-tab') === id)),
    );
    $$('[data-board-panel]').forEach((panel) =>
      panel.setAttribute('data-active', String(panel.getAttribute('data-board-panel') === id)),
    );
  }

  /* ---------- "today" highlight on the hours rows ---------- */
  function markToday() {
    const today = new Date().getDay();
    $$('[data-days]').forEach((row) => {
      let days = [];
      try {
        days = JSON.parse(row.getAttribute('data-days'));
      } catch { /* ignore */ }
      row.classList.toggle('is-today', Array.isArray(days) && days.includes(today));
    });
  }

  /* ---------- mobile nav ---------- */
  function closeNav() {
    const nav = $('#site-nav');
    const tgl = $('[data-nav-toggle]');
    if (nav) nav.classList.remove('is-open');
    if (tgl) tgl.setAttribute('aria-expanded', 'false');
  }

  /* ---------- events (delegated) ---------- */
  function wire() {
    document.addEventListener('click', (e) => {
      const target = /** @type {Element} */ (e.target);

      // Clicking outside an open mobile nav closes it (then the click continues).
      const nav = $('#site-nav');
      if (
        nav &&
        nav.classList.contains('is-open') &&
        !target.closest('#site-nav') &&
        !target.closest('[data-nav-toggle]')
      ) {
        closeNav();
      }

      const navToggle = target.closest('[data-nav-toggle]');
      if (navToggle) {
        const open = $('#site-nav').classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(open));
        return;
      }

      const navLink = target.closest('.site-nav__link');
      if (navLink) return closeNav(); // let the anchor jump happen

      const langBtn = target.closest('.lang-toggle button[data-lang]');
      if (langBtn) return setLang(langBtn.getAttribute('data-lang'));

      const add = target.closest('[data-add]');
      if (add) return addItem(add.getAttribute('data-add'));

      const tab = target.closest('[data-board-tab]');
      if (tab) return setBoardTab(tab.getAttribute('data-board-tab'));

      const open = target.closest('[data-act="open-sheet"]');
      if (open) { e.preventDefault(); return openSheet(); }

      const close = target.closest('[data-act="close-sheet"]');
      if (close) return closeSheet();

      const step = target.closest('[data-act="inc"],[data-act="dec"]');
      if (step) return setQty(step.getAttribute('data-id'), step.getAttribute('data-act') === 'inc' ? 1 : -1);

      const pchip = target.closest('[data-pickup]');
      if (pchip) { pickupKey = pchip.getAttribute('data-pickup'); return renderSheet(); }

      const clr = target.closest('[data-act="clear"]');
      if (clr) return clearOrder();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (isSheetOpen()) closeSheet();
      closeNav();
    });
  }

  /* ---------- init ---------- */
  try {
    const o = JSON.parse(read('cesia_order') || 'null');
    if (o && typeof o === 'object') order = o;
  } catch { /* ignore */ }

  const stored = read('cesia_lang');
  if (stored === 'en' || stored === 'es') lang = stored;
  else if ((navigator.language || '').toLowerCase().startsWith('es')) lang = 'es';

  wire();
  applyLang();
  markToday();
  updateCount();
}

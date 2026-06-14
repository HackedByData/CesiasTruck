/* Smoke test for the Cesia's Truck client island.
   Loads the built homepage into jsdom, runs initCesia(), then drives the
   real user flows: add-to-order, language switch, the menu board's category
   tabs, and the pre-filled SMS in the order drawer. */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, '../dist/index.html'), 'utf8');

const dom = new JSDOM(html, { url: 'https://cesiastruck.com', pretendToBeVisual: true });
const { window } = dom;

// Wire the globals app.js reaches for. Some (navigator, localStorage) are
// read-only getters on Node 24's globalThis, so define rather than assign.
const defineGlobal = (name, value) => {
  try {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  } catch {
    try {
      globalThis[name] = value;
    } catch {
      /* fall back to Node's built-in */
    }
  }
};
defineGlobal('window', window);
defineGlobal('document', window.document);
defineGlobal('navigator', window.navigator);
defineGlobal('localStorage', window.localStorage);
defineGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0));
window.requestAnimationFrame = globalThis.requestAnimationFrame;
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.getSelection = () => ({ selectAllChildren() {} });

let failures = 0;
const assert = (cond, msg) => {
  if (cond) {
    console.log('  ✓', msg);
  } else {
    console.error('  ✗ FAIL:', msg);
    failures++;
  }
};

const { initCesia } = await import('../src/scripts/app.js');
initCesia();
console.log('island initialised without throwing\n');

// 0) Mobile hamburger toggles the nav drop-down
const navToggleBtn = document.querySelector('[data-nav-toggle]');
const siteNav = document.getElementById('site-nav');
assert(siteNav && !siteNav.classList.contains('is-open'), 'mobile nav starts closed');
navToggleBtn.click();
assert(siteNav.classList.contains('is-open'), 'hamburger opens the mobile nav');
assert(navToggleBtn.getAttribute('aria-expanded') === 'true', 'toggle reports aria-expanded=true');
document.querySelector('.site-nav__link').click();
assert(!siteNav.classList.contains('is-open'), 'tapping a nav link closes the menu');
assert(navToggleBtn.getAttribute('aria-expanded') === 'false', 'toggle aria-expanded resets to false');

const countEl = document.getElementById('order-count');

// 1) Add to order updates the header Order count
document.querySelector('[data-add="quesatacos"]').click();
assert(/1/.test(countEl.textContent), `header Order count shows 1: "${countEl.textContent}"`);

// 2) Add a second, different item
document.querySelector('[data-add="birriapizza"]').click();
assert(/2/.test(countEl.textContent), `header Order count shows 2: "${countEl.textContent}"`);

// 3) Language switch to Spanish translates nav, hero kicker, and a board tab
document.querySelector('.lang-toggle button[data-lang="es"]').click();
assert(document.documentElement.lang === 'es', 'html lang flips to es');
assert(
  document.querySelector('[data-i18n="hero.kicker"]').textContent === 'tu taco favorito',
  'hero kicker translates to "tu taco favorito"',
);
assert(
  document.querySelector('[data-i18n="nav.menu"]').textContent === 'Menú',
  'nav "Menu" translates to "Menú"',
);
assert(
  document.querySelector('[data-board-tab="drinks"]').textContent.trim() === 'Bebidas',
  'menu board tab "Drinks" translates to "Bebidas"',
);

// 4) Menu board category tabs switch the active panel
document.querySelector('[data-board-tab="drinks"]').click();
assert(
  document.querySelector('[data-board-panel="drinks"]').getAttribute('data-active') === 'true',
  'clicking the Drinks tab activates the Drinks panel',
);
assert(
  document.querySelector('[data-board-panel="tacos"]').getAttribute('data-active') === 'false',
  'the Tacos panel deactivates',
);
assert(
  document.querySelector('[data-board-tab="drinks"]').getAttribute('aria-selected') === 'true',
  'the Drinks tab is aria-selected',
);

// 5) Open the order drawer and check totals + the pre-filled SMS
document.querySelector('[data-act="open-sheet"]').click();
assert(document.getElementById('sheet').classList.contains('is-open'), 'order drawer opens');
assert(
  document.querySelector('.sub-row__v').textContent === '$25.75',
  `drawer subtotal is $25.75 (3.75 + 22.00): "${document.querySelector('.sub-row__v').textContent}"`,
);
const chips = document.querySelectorAll('.pchip');
assert(chips.length === 5, `pickup picker shows ASAP + 4 times (${chips.length})`);

const send = document.getElementById('send-btn');
const href = send ? decodeURIComponent(send.getAttribute('href')) : '';
assert(href.startsWith('sms:+17147106159?&body='), 'send button is an sms: link to the truck');
assert(href.includes('1x Quesatacos ($3.75)'), 'SMS body lists Quesatacos with price');
assert(href.includes('1x Birria Pizza ($22.00)'), 'SMS body lists Birria Pizza with price');
assert(href.includes('Recoger:'), 'SMS uses the Spanish pickup label "Recoger"');
assert(href.includes('(Precio + Impuesto)'), 'SMS estimate notes "Precio + Impuesto"');

// 6) Stepper increments a line item
document.querySelector('[data-act="inc"][data-id="quesatacos"]').click();
assert(
  document.querySelector('.si .stepper__q').textContent === '2',
  'stepper bumps Quesatacos to qty 2',
);

// 7) Clear order empties the drawer + resets the count
document.querySelector('[data-act="clear"]').click();
assert(countEl.textContent.trim() === '', 'clearing the order resets the header count');
assert(document.querySelector('.sheet-empty') !== null, 'cleared drawer shows the empty state');

console.log(failures === 0 ? '\nAll island checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);

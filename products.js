/* HANGR — product data + original SVG garments (front & back) */
(function () {
  'use strict';

  /* ---------- color helpers ---------- */
  function tone(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, a = Math.abs(amt);
    r = Math.round(r + (t - r) * a);
    g = Math.round(g + (t - g) * a);
    b = Math.round(b + (t - b) * a);
    return `rgb(${r},${g},${b})`;
  }

  /* ---------- small drawing helpers ---------- */
  function T(x, y, size, txt, fill, o = {}) {
    const w = o.w || 800, ls = o.ls || 0, st = o.st || 125, op = o.op == null ? 1 : o.op;
    const fit = o.tl ? ` textLength="${o.tl}" lengthAdjust="spacingAndGlyphs"` : '';
    return `<text${fit} x="${x}" y="${y}" font-size="${size}" fill="${fill}" fill-opacity="${op}" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-weight="${w}" letter-spacing="${ls}" style="font-stretch:${st}%">${txt}</text>`;
  }
  function star(cx, cy, r, fill) {
    let pts = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      pts += `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)} `;
    }
    return `<polygon points="${pts}" fill="${fill}"/>`;
  }
  const mx = (x) => 200 - x; // mirror around center

  /* ---------- silhouettes ---------- */
  function teeBody(bw, d, neck) {
    const R = 100 + bw, L = 100 - bw;
    return `M74,14 ${neck} L${R + 8},24 Q${R + 22},30 ${R + 28},44 L${R + 40},${80 + d} L${R + 12},${94 + d} L${R},${76 + d} L${R},206 Q100,213 ${L},206 L${L},${76 + d} L${L - 12},${94 + d} L${L - 40},${80 + d} L${L - 28},44 Q${L - 22},30 ${L - 8},24 Z`;
  }
  function longBody(bw, neck) {
    const R = 100 + bw, L = 100 - bw;
    return `M74,14 ${neck} L${R + 6},26 Q${R + 20},32 ${R + 26},48 L${R + 38},194 L${R + 14},198 L${R + 2},96 L${R},206 Q100,213 ${L},206 L${L - 2},96 L${L - 14},198 L${L - 38},194 L${L - 26},48 Q${L - 20},32 ${L - 6},26 Z`;
  }

  /* ---------- the garment builder ---------- */
  function garment(p, side, uid) {
    const c = p.hex, dark = tone(c, -0.2), darker = tone(c, -0.42);
    const long = p.cut === 'hoodie' || p.cut === 'jacket';
    const bw = { oversized: 63, jacket: 62, hoodie: 60 }[p.cut] || 56;
    const d = p.cut === 'oversized' ? 8 : 0;
    const R = 100 + bw;
    const front = side === 'front';

    let neck;
    if (!front) neck = 'C86,21 114,21 126,14';
    else if (p.cut === 'hoodie') neck = 'C84,38 116,38 126,14';
    else if (p.cut === 'jacket') neck = 'C86,24 114,24 126,14';
    else neck = 'C84,32 116,32 126,14';

    const body = long ? longBody(bw, neck) : teeBody(bw, d, neck);
    const hoodFront = 'M58,36 C52,-2 148,-2 142,36 Z';
    const hoodBack = 'M66,16 C62,3 138,3 134,16 L128,86 Q100,104 72,86 Z';

    let s = `<svg viewBox="-10 -4 220 224" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<defs><clipPath id="c${uid}"><path d="${body}"/></clipPath>
<linearGradient id="g${uid}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient></defs>`;

    // hood sits behind the body on the front view
    if (p.cut === 'hoodie' && front) {
      s += `<path d="${hoodFront}" fill="${dark}"/><path d="M60,34 C56,4 144,4 140,34" fill="none" stroke="${darker}" stroke-opacity=".5" stroke-width="1.4"/>`;
    }

    s += `<path d="${body}" fill="${c}"/>`;

    /* --- details clipped to the body --- */
    let det = '';
    // soft folds
    det += `<path d="M72,120 Q80,160 74,204" fill="none" stroke="#000" stroke-opacity=".06" stroke-width="2"/><path d="M132,110 Q124,150 130,204" fill="none" stroke="#000" stroke-opacity=".05" stroke-width="2"/>`;

    if (long) {
      const cuff = (k) => `<path d="M${k(R + 37)},182 L${k(R + 38.5)},195 L${k(R + 14)},199 L${k(R + 12.5)},186 Z" fill="${dark}" opacity=".7"/>`;
      det += cuff((x) => x) + cuff(mx);
      det += `<rect x="-10" y="194" width="220" height="24" fill="${dark}" opacity=".55"/>`;
      det += `<path d="M${100 - bw},194 H${R}" stroke="${darker}" stroke-opacity=".35" stroke-width=".8"/>`;
    } else {
      det += `<path d="M${R + 37},${73 + d} L${R + 10},${87 + d}" stroke="${darker}" stroke-opacity=".28" stroke-width="1"/><path d="M${mx(R + 37)},${73 + d} L${mx(R + 10)},${87 + d}" stroke="${darker}" stroke-opacity=".28" stroke-width="1"/>`;
      det += `<path d="M${100 - bw},199 Q100,206 ${R},199" fill="none" stroke="${darker}" stroke-opacity=".28" stroke-width="1"/>`;
    }

    if (p.cut === 'hoodie' && front) {
      if (p.detail === 'zip') {
        det += `<path d="M100,34 V206" stroke="${darker}" stroke-width="2.2"/><path d="M100,34 V206" stroke="${tone(c, 0.35)}" stroke-width=".6" stroke-dasharray="1.4 1.4"/><rect x="97.5" y="40" width="5" height="11" rx="1.5" fill="${darker}"/>`;
        det += `<path d="M64,150 L74,176 M136,150 L126,176" stroke="${darker}" stroke-opacity=".5" stroke-width="1.4"/>`;
      } else {
        det += `<path d="M62,150 L76,124 H124 L138,150 V188 H62 Z" fill="${tone(c, -0.05)}" stroke="${darker}" stroke-opacity=".45" stroke-width="1.1"/>`;
      }
      det += `<path d="M90,34 L88,84 M110,34 L112,84" stroke="${tone(c, 0.55)}" stroke-width="1.8" stroke-linecap="round"/><rect x="86.6" y="82" width="3" height="7" rx="1" fill="${darker}"/><rect x="110.4" y="82" width="3" height="7" rx="1" fill="${darker}"/>`;
    }

    if (p.cut === 'jacket' && front) {
      if (p.detail === 'coach') {
        det += `<path d="M104,30 V206" stroke="${darker}" stroke-opacity=".55" stroke-width="1.2"/>`;
        for (let y = 62; y <= 182; y += 30) det += `<circle cx="104" cy="${y}" r="2.6" fill="${tone(c, -0.5)}"/><circle cx="103.4" cy="${y - 0.6}" r=".9" fill="#fff" opacity=".4"/>`;
      } else {
        det += `<path d="M100,30 V206" stroke="${darker}" stroke-width="2"/><path d="M100,30 V206" stroke="${tone(c, 0.3)}" stroke-width=".6" stroke-dasharray="1.4 1.4"/><rect x="97.6" y="44" width="4.8" height="10" rx="1.5" fill="${tone(c, -0.55)}"/>`;
      }
      if (p.detail === 'field') {
        const pk = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${tone(c, -0.04)}" stroke="${darker}" stroke-opacity=".5" stroke-width="1"/><rect x="${x - 1}" y="${y - 2}" width="${w + 2}" height="9" fill="${tone(c, -0.1)}" stroke="${darker}" stroke-opacity=".5" stroke-width="1"/><circle cx="${x + w / 2}" cy="${y + 4}" r="1.5" fill="${darker}"/>`;
        det += pk(58, 60, 28, 26) + pk(114, 60, 28, 26) + pk(54, 132, 34, 36) + pk(112, 132, 34, 36);
      }
    }

    if (p.cut === 'jacket' && !front) {
      det += `<path d="M${100 - bw - 4},60 Q100,68 ${R + 4},60" fill="none" stroke="${darker}" stroke-opacity=".4" stroke-width="1"/>`;
    }

    // print / graphic
    const g = front ? p.front : p.back;
    det += g ? g(p.ink, uid, c) : '';

    det += `<rect x="-10" y="-4" width="220" height="224" fill="url(#g${uid})"/>`;
    s += `<g clip-path="url(#c${uid})">${det}</g>`;

    /* --- unclipped trims on top --- */
    if (front && p.cut !== 'jacket' && p.cut !== 'hoodie') {
      // inside back of the neck + the wooden hanger bar peeking through
      s += `<path d="M74,14 C84,32 116,32 126,14 C116,21 84,21 74,14 Z" fill="${darker}"/>`;
      s += `<path d="M82,18.5 Q100,23.5 118,18.5" fill="none" stroke="#A97C50" stroke-width="3.4" stroke-linecap="round"/>`;
      s += `<path d="M74,14 C84,32 116,32 126,14" fill="none" stroke="${dark}" stroke-width="4.4"/>`;
    }
    if (front && p.cut === 'hoodie') {
      s += `<path d="M74,14 C84,38 116,38 126,14 C114,22 86,22 74,14 Z" fill="${darker}"/>`;
      s += `<path d="M74,14 C84,38 116,38 126,14" fill="none" stroke="${dark}" stroke-width="3"/>`;
    }
    if (front && p.cut === 'jacket') {
      s += `<path d="M74,14 C86,24 114,24 126,14 C114,20 86,20 74,14 Z" fill="${darker}"/>`;
      const fill = tone(c, -0.07);
      s += `<path d="M73,13 L90,47 L100,31 L99,20 Z" fill="${fill}" stroke="${darker}" stroke-opacity=".55" stroke-width="1"/>`;
      s += `<path d="M127,13 L110,47 L100,31 L101,20 Z" fill="${fill}" stroke="${darker}" stroke-opacity=".55" stroke-width="1"/>`;
    }
    if (!front) {
      if (p.cut === 'hoodie') {
        s += `<path d="${hoodBack}" fill="${tone(c, -0.06)}" stroke="${darker}" stroke-opacity=".45" stroke-width="1"/><path d="M100,6 V98" stroke="${darker}" stroke-opacity=".35" stroke-width="1"/>`;
      } else if (p.cut === 'jacket') {
        s += `<path d="M74,14 C86,22 114,22 126,14 L124,6 C112,12 88,12 76,6 Z" fill="${tone(c, -0.08)}" stroke="${darker}" stroke-opacity=".5" stroke-width="1"/>`;
      } else {
        s += `<path d="M74,14 C86,21 114,21 126,14" fill="none" stroke="${dark}" stroke-width="3.6"/>`;
      }
    }

    // shade layer driven by rotation (opacity set from JS)
    s += `<g class="shade" opacity="0"><path d="${body}"/>${p.cut === 'hoodie' ? `<path d="${front ? hoodFront : hoodBack}"/>` : ''}</g>`;
    s += `</svg>`;
    return s;
  }

  /* ---------- products ---------- */
  const PRODUCTS = [
    {
      id: 'oversized-basic', name: 'Oversized Basic Tee', cat: 'tshirts', price: 119,
      color: 'Bone', hex: '#E6E1D6', ink: '#1E1E1C', cut: 'oversized',
      desc: 'Heavy 240 gsm cotton with dropped shoulders and a boxy body. Small wordmark on the chest, a large one across the back.',
      front: (ink) => T(127, 62, 7, 'HANGR', ink, { ls: 1 }),
      back: (ink) => T(100, 78, 30, 'HANGR', ink, { ls: 2, tl: 84 }) + `<rect x="60" y="88" width="80" height="1.6" fill="${ink}"/>` + T(100, 102, 6.5, 'OVERSIZED FIT', ink, { w: 600, ls: 2.5, st: 100 }),
    },
    {
      id: 'unknown-graphic', name: 'Unknown Graphic Tee', cat: 'tshirts', price: 139,
      color: 'Black', hex: '#1D1D1D', ink: '#ECEBE6', cut: 'tee',
      desc: 'A question mark on the front, the answer on the back. Soft-hand print on midweight cotton.',
      front: (ink) => `<circle cx="100" cy="86" r="27" fill="none" stroke="${ink}" stroke-width="3"/>` + T(100, 101, 40, '?', ink),
      back: (ink) => T(100, 70, 21, 'UNKNOWN', ink, { tl: 86 }) + T(100, 93, 21, 'UNKNOWN', ink, { op: 0.55, tl: 86 }) + T(100, 116, 21, 'UNKNOWN', ink, { op: 0.25, tl: 86 }),
    },
    {
      id: 'vintage-street', name: 'Vintage Streetwear Tee', cat: 'tshirts', price: 149,
      color: 'Washed sage', hex: '#6F7C66', ink: '#EEE8D8', cut: 'tee',
      desc: 'Garment-dyed and washed for a lived-in feel. Arched chest print and a dated badge on the back.',
      front: (ink, uid) => `<path id="a${uid}" d="M56,96 A44,44 0 0 1 144,96" fill="none"/><text font-size="9.5" fill="${ink}" font-family="Archivo, system-ui, sans-serif" font-weight="800" letter-spacing="1.2" style="font-stretch:125%"><textPath href="#a${uid}" startOffset="50%" text-anchor="middle">VINTAGE STREETWEAR</textPath></text>` + star(100, 88, 9, ink),
      back: (ink) => `<circle cx="100" cy="88" r="31" fill="none" stroke="${ink}" stroke-width="2.6"/><circle cx="100" cy="88" r="25" fill="none" stroke="${ink}" stroke-width=".8"/>` + T(100, 84, 8.5, 'EST.', ink, { w: 700, ls: 1.5 }) + T(100, 99, 13, '2026', ink) + `<path d="M60,140 H140 M60,147 H140 M60,154 H140" stroke="${ink}" stroke-width="2.4"/>`,
    },
    {
      id: 'essential-hoodie', name: 'Essential Hoodie', cat: 'hoodies', price: 229,
      color: 'Heather grey', hex: '#B9BCBF', ink: '#26272A', cut: 'hoodie',
      desc: 'Brushed-back fleece, double-layer hood and a roomy kangaroo pocket. The one you reach for first.',
      front: (ink) => T(100, 64, 6.5, 'ESSENTIAL', ink, { w: 700, ls: 2.5 }),
      back: (ink) => T(100, 140, 19, 'ESSENTIAL', ink, { ls: 1, tl: 84 }) + `<rect x="62" y="148" width="76" height="1.4" fill="${ink}"/>` + T(100, 161, 6, 'HEAVYWEIGHT FLEECE', ink, { w: 600, ls: 2.2, st: 100 }),
    },
    {
      id: 'urban-jacket', name: 'Urban Jacket', cat: 'jackets', price: 349,
      color: 'Navy', hex: '#25314A', ink: '#E7E3DA', cut: 'jacket', detail: 'urban',
      desc: 'Water-resistant shell with a clean zip front. A city skyline is printed across the back.',
      front: (ink, uid, c) => `<rect x="116" y="58" width="22" height="13" rx="2" fill="${ink}"/>` + T(127, 67.5, 7, 'U', c),
      back: (ink) => {
        const h = [22, 34, 18, 44, 28, 52, 30, 40, 20, 36, 24];
        let r = '';
        h.forEach((v, i) => { r += `<rect x="${52 + i * 9}" y="${148 - v}" width="7" height="${v}" fill="${ink}" opacity="${i % 2 ? 0.75 : 1}"/>`; });
        return r + `<rect x="48" y="148" width="104" height="1.6" fill="${ink}"/>` + T(100, 172, 15, 'URBAN', ink, { ls: 2, tl: 58 });
      },
    },
    {
      id: 'minimal-white', name: 'Minimal White Tee', cat: 'tshirts', price: 99,
      color: 'White', hex: '#F7F7F4', ink: '#1A1A1A', cut: 'tee',
      desc: 'Clean, bright and quiet. A single dot on the chest and a whisper of text below the back collar.',
      front: (ink) => `<circle cx="127" cy="60" r="2.6" fill="${ink}"/>`,
      back: (ink) => T(100, 36, 5.6, 'minimal', ink, { w: 500, ls: 3, st: 100 }),
    },
    {
      id: 'night-shift', name: 'Night Shift Hoodie', cat: 'hoodies', price: 249,
      color: 'Charcoal', hex: '#2E2F33', ink: '#E5E2D8', cut: 'hoodie',
      desc: 'For late walks and later ideas. Crescent on the chest, a constellation map across the back.',
      front: (ink, uid, c) => `<circle cx="125" cy="64" r="9" fill="${ink}"/><circle cx="129.5" cy="60.5" r="8" fill="${c}"/>`,
      back: (ink) => {
        const pts = [[62, 124], [78, 112], [94, 128], [110, 116], [126, 122], [140, 106], [118, 140], [86, 146]];
        let r = `<polyline points="${pts.slice(0, 6).map((q) => q.join(',')).join(' ')}" fill="none" stroke="${ink}" stroke-width=".9" opacity=".7"/><path d="M110,116 L118,140 L86,146 L94,128" fill="none" stroke="${ink}" stroke-width=".9" opacity=".7"/>`;
        pts.forEach(([x, y], i) => { r += `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.8 : 2.6}" fill="${ink}"/>`; });
        return r + T(100, 174, 12.5, 'NIGHT SHIFT', ink, { ls: 1.5, tl: 80 });
      },
    },
    {
      id: 'coach-jacket', name: 'Coach Jacket', cat: 'jackets', price: 319,
      color: 'Sand', hex: '#CDB894', ink: '#2B2620', cut: 'jacket', detail: 'coach',
      desc: 'Light nylon coach jacket with a snap front and drawcord hem. Team print arched across the back.',
      front: (ink) => T(128, 62, 6, 'COACH', ink, { ls: 1.5 }),
      back: (ink, uid) => `<path id="a${uid}" d="M50,118 A60,52 0 0 1 150,118" fill="none"/><text font-size="22" fill="${ink}" font-family="Archivo, system-ui, sans-serif" font-weight="800" letter-spacing="2" style="font-stretch:125%"><textPath href="#a${uid}" startOffset="50%" text-anchor="middle">COACH</textPath></text>` + T(100, 132, 7, 'TEAM HANGR', ink, { w: 600, ls: 3, st: 100 }),
    },
    {
      id: 'pocket-tee', name: 'Pocket Tee', cat: 'tshirts', price: 109,
      color: 'Cobalt', hex: '#2F44C6', ink: '#F1F1EC', cut: 'tee',
      desc: 'Saturated cobalt with a stitched chest pocket. Fits true to size.',
      front: (ink, uid, c) => `<path d="M113,54 H142 V80 Q127.5,87 113,80 Z" fill="${tone(c, -0.08)}" stroke="${tone(c, 0.35)}" stroke-width=".9" stroke-dasharray="2 1.6"/>`,
      back: (ink) => T(100, 38, 5.6, 'POCKET TEE', ink, { w: 600, ls: 3, st: 100 }),
    },
    {
      id: 'signal-tee', name: 'Signal Tee', cat: 'tshirts', price: 139,
      color: 'Brick', hex: '#B3392E', ink: '#F4EEE4', cut: 'tee',
      desc: 'A sound wave across the chest and a level meter on the back. Turn it up.',
      front: (ink) => {
        let pts = '';
        for (let x = 52; x <= 148; x += 2) {
          const k = (x - 52) / 96, env = Math.sin(k * Math.PI);
          pts += `${x},${(84 + Math.sin(x * 0.55) * 16 * env * (0.5 + 0.5 * Math.sin(x * 0.13))).toFixed(1)} `;
        }
        return `<polyline points="${pts}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      },
      back: (ink) => {
        const h = [10, 18, 28, 40, 34, 48, 56, 44, 30, 38, 22, 14, 8];
        let r = '';
        h.forEach((v, i) => { r += `<rect x="${55 + i * 7}" y="${124 - v}" width="4.4" height="${v}" fill="${ink}"/>`; });
        return r + T(100, 140, 8, 'SIGNAL', ink, { ls: 3 });
      },
    },
    {
      id: 'zip-hoodie', name: 'Zip Hoodie', cat: 'hoodies', price: 259,
      color: 'Lilac', hex: '#B6A9D4', ink: '#2B2638', cut: 'hoodie', detail: 'zip',
      desc: 'Full-zip fleece in a soft lilac. Split pockets, ribbed cuffs and a bold ring print on the back.',
      front: (ink) => T(76, 64, 6, 'ZIP', ink, { ls: 1.5 }),
      back: (ink) => `<circle cx="100" cy="146" r="25" fill="none" stroke="${ink}" stroke-width="3"/>` + T(100, 151, 12, 'ZIP', ink, { ls: 1 }) + T(100, 186, 6, 'FULL ZIP FLEECE', ink, { w: 600, ls: 2.2, st: 100 }),
    },
    {
      id: 'field-jacket', name: 'Field Jacket', cat: 'jackets', price: 389,
      color: 'Khaki', hex: '#8A8462', ink: '#F0ECDF', cut: 'jacket', detail: 'field',
      desc: 'Four-pocket cotton twill field jacket. Built for carrying everything, with a woven tag at the back.',
      front: () => '',
      back: (ink, uid, c) => `<rect x="86" y="30" width="28" height="10" fill="${ink}"/>` + T(100, 37.3, 5, 'FIELD 12', c, { w: 700, ls: 1 }),
    },
  ];

  const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'tshirts', label: 'T-Shirts' },
    { id: 'hoodies', label: 'Hoodies' },
    { id: 'jackets', label: 'Jackets' },
  ];

  const HOOK = `<svg class="hook" viewBox="0 0 40 50" aria-hidden="true" focusable="false"><path d="M20,50 V31 C20,24 29,23 29,13 C29,6 23,3 18,4 C13,5 11,9 12,13" fill="none" stroke="#7E848B" stroke-width="3" stroke-linecap="round"/><path d="M20,48 V31 C20,25 28,23.5 28,13.5" fill="none" stroke="#D9DDE1" stroke-width=".9" stroke-linecap="round"/></svg>`;

  window.HANGR = { PRODUCTS, CATEGORIES, garment, HOOK };
})();

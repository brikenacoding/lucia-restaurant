/* ============================================================
   LUCIA — IMAGE MANIFEST
   ------------------------------------------------------------
   Single source of truth for every photograph in the project.
   All images are hosted on Pexels and used under the Pexels
   License (free for commercial use, no attribution required —
   we credit anyway, as a matter of practice).

   Full provenance is recorded in /IMAGE_SOURCES.md

   `useLocal` — set to true after running tools/fetch-images.sh
   to serve optimised local copies from /assets/img instead of
   the Pexels CDN.
   ============================================================ */

const USE_LOCAL = false;

const CDN = 'https://images.pexels.com/photos';

/* Pexels CDN accepts width + compression params, which gives us
   genuine responsive sizes without any build step. */
function pexels(id, w) {
  return `${CDN}/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=${w}`;
}

const IMG = {
  /* --- rooms & atmosphere ------------------------------- */
  heroRoom:     { id: 28059309, alt: 'A long dining table laid with candles beneath a low chandelier', credit: 'Jonathan Borba' },
  roomBar:      { id: 5863513,  alt: 'The bar of a restaurant, bottles backlit against dark timber', credit: 'Rachel Claire' },
  roomWarm:     { id: 9371714,  alt: 'A dining room of timber chairs and tables under soft evening light', credit: 'Amine' },
  roomNight:    { id: 11279651, alt: 'A dining room at night, lamps reflected in the windows', credit: 'Ahsen' },
  roomClassic:  { id: 2504911,  alt: 'A high-ceilinged dining room with laid tables and glassware', credit: 'Rene Terp' },
  roomStylish:  { id: 4913313,  alt: 'A small dining room with laid tables and warm overhead lighting', credit: 'Maria Orlova' },

  /* --- the fire ----------------------------------------- */
  fireChef:     { id: 7205249,  alt: 'A cook working over open flame in a restaurant kitchen', credit: 'Helmy Zairy' },
  fireGrill:    { id: 1233101,  alt: 'Meat cooking over open coals, close up', credit: 'Malte Luk' },
  kitchen:      { id: 5251019,  alt: 'Cooks at work along a restaurant pass', credit: 'Emil Lazarian' },
  seafoodGrill: { id: 4571250,  alt: 'Shellfish and fish cooking over a charcoal grill', credit: 'Yan Stavchansky' },

  /* --- details ------------------------------------------ */
  tableSetting: { id: 735869,   alt: 'A laid place setting with glassware and folded linen', credit: 'Burak The Weekender' },
  napkin:       { id: 19921112, alt: 'Cutlery resting on a folded napkin on a plate', credit: 'wutthichai charoenburi' },
  espresso:     { id: 30384438, alt: 'A hand lifting a small espresso cup from a timber table', credit: 'Eva Belšánová Langrová' },
  winePour:     { id: 4691211,  alt: 'Red wine being poured into a glass at a dim counter', credit: 'cottonbro studio' },
  negroni:      { id: 1304540,  alt: 'A short glass of Negroni with a slice of orange', credit: 'Isabella Mendes' },

  /* --- the sea ------------------------------------------ */
  sea:          { id: 29837765, alt: 'A rocky Mediterranean coastline seen from above', credit: 'Anna S' },
  seaRocks:     { id: 23962081, alt: 'Clear shallow water against a rocky shore', credit: 'Serhii Panasiuk' },

  /* --- dishes ------------------------------------------- */
  octopus:      { id: 921361,   alt: 'Charred octopus with herbs and potato on a pale plate', credit: 'Alex Favali' },
  octopusPlate: { id: 14885388, alt: 'Octopus served on a patterned plate with a saffron-coloured sauce', credit: 'Toni Canaj' },
  burrata:      { id: 26833230, alt: 'Burrata with cherry tomatoes being served', credit: 'Nadin Sh' },
  mezze:        { id: 5944,     alt: 'A spread of dips, flatbread and olive oil', credit: 'Karolina Grabowska' },
  caprese:      { id: 28841111, alt: 'Mozzarella and tomato dressed with oil and basil', credit: 'Nano Erdozain' },
  pastaPesto:   { id: 4162492,  alt: 'Pasta dressed in green herb sauce with shaved cheese', credit: 'Daniele Sgura' },
  pastaMush:    { id: 3214160,  alt: 'Pasta with mushrooms, basil and grated cheese', credit: 'Engin Akyurt' },
  pastaMarble:  { id: 4518879,  alt: 'A plate of pasta on marble with brass cutlery, seen from above', credit: 'Polina Tankilevitch' },
  fishFine:     { id: 6839650,  alt: 'A fillet of fish plated with green vegetables and sauce', credit: 'cottonbro studio' },
  fishWhole:    { id: 11653557, alt: 'Whole roasted fish with charred vegetables', credit: 'Cristian Mihaila' },
  prawns:       { id: 1998920,  alt: 'Grilled prawns with charred lemon, seen from above', credit: 'Kristina Paukshtite' },
  vegetables:   { id: 19856566, alt: 'Charred peppers and vegetables arranged on a plate', credit: 'Markus Winkler' },
  cakeCitrus:   { id: 15526782, alt: 'A slice of pale citrus cake on a plate', credit: 'Pouyan Moujoodi' },
  cakePistachio:{ id: 13715795, alt: 'A slice of pistachio cake on a white plate, seen from above', credit: 'Razane Adra' },
  cakeChoc:     { id: 30128890, alt: 'A dark chocolate cake slice on a plate in low light', credit: 'Sylwester Ficek' },
  cheeseBoard:  { id: 4187783,  alt: 'An assortment of cheeses with bread', credit: 'Polina Tankilevitch' },
};

/* Public helpers -------------------------------------------------- */

/** Full-size source for a given key. */
function imgSrc(key, w = 1400) {
  const e = IMG[key];
  if (!e) return '';
  return USE_LOCAL ? `assets/img/${key}.jpg` : pexels(e.id, w);
}

/** srcset across sensible breakpoints. */
function imgSrcset(key, widths = [640, 960, 1400, 1920]) {
  const e = IMG[key];
  if (!e || USE_LOCAL) return '';
  return widths.map((w) => `${pexels(e.id, w)} ${w}w`).join(', ');
}

function imgAlt(key) {
  return (IMG[key] && IMG[key].alt) || '';
}

function imgCredit(key) {
  return (IMG[key] && IMG[key].credit) || '';
}

function imgPexelsPage(key) {
  const e = IMG[key];
  return e ? `https://www.pexels.com/photo/${e.id}/` : '#';
}

window.LUCIA_IMAGES = { IMG, imgSrc, imgSrcset, imgAlt, imgCredit, imgPexelsPage };

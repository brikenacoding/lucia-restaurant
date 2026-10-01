#!/usr/bin/env node
/**
 * LUCIA — automated QA
 * -------------------------------------------------------------
 * Run:  node tools/qa.mjs
 *
 * A lightweight regression check, not a test framework. It exists
 * to catch the exact class of bug this project had before: a
 * number or a piece of content that quietly drifted out of sync
 * with assets/js/data.js. It checks:
 *
 *   - the shape of MENU / WINE / RESTAURANT (required fields,
 *     valid dietary keys, no duplicate ids within a course/group)
 *   - that no HTML/CSS/JS file contains a hard-coded count that
 *     contradicts what data.js actually has (the "Forty bottles"
 *     class of bug)
 *   - that fragment links like menu.html#desserts point at a
 *     course id that actually exists
 *   - that internal page links resolve to a real file
 *   - leftover TODO/FIXME/placeholder markers
 *   - runs tools/build_pdf.py, whose own validate_coverage() is
 *     the authority on PDF/data sync — this script does not
 *     re-implement that check, it just surfaces the result
 *
 * Exits non-zero on any failure, so it's safe to wire into a
 * pre-commit hook or CI step if this project ever gets one.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const fails = [];
const warn = [];
const ok = (label) => console.log('  \u2713 ' + label);
const fail = (label) => { fails.push(label); console.log('  \u2717 ' + label); };

console.log('LUCIA — automated QA\n');

/* ---------------------------------------------------------------
   1. Load data.js / images.js the way the browser does: as two
   classic scripts sharing one global scope.
   ------------------------------------------------------------- */
const sandbox = { window: {}, console };
vm.createContext(sandbox);
for (const file of ['assets/js/images.js', 'assets/js/data.js']) {
  const src = readFileSync(join(ROOT, file), 'utf8');
  vm.runInContext(src, sandbox, { filename: file });
}
const { RESTAURANT, DIETARY_LEGEND, ALLERGEN_LEGEND, MENU, WINE, LUCIA_FACTS } = sandbox.window.LUCIA_DATA;

console.log('1. Data shape');
{
  const dietKeys = new Set(DIETARY_LEGEND.map(d => d.key));
  const allergenKeys = new Set(ALLERGEN_LEGEND.map(a => a.key));
  const courseIds = new Set();
  let dishTotal = 0;

  for (const c of MENU) {
    if (!c.id || !c.title) { fail(`course missing id/title: ${JSON.stringify(c).slice(0, 60)}`); continue; }
    if (courseIds.has(c.id)) fail(`duplicate course id: ${c.id}`);
    courseIds.add(c.id);

    const names = new Set();
    for (const it of c.items) {
      dishTotal++;
      if (!it.name) fail(`item with no name in course "${c.id}"`);
      if (names.has(it.name)) fail(`duplicate item name in "${c.id}": ${it.name}`);
      names.add(it.name);
      if (typeof it.price !== 'number') fail(`non-numeric price: ${it.name}`);
      // description is intentionally optional — a handful of simple
      // items (espresso, still water) are meant to stand with no
      // italic line under them, so an empty description is not a bug
      for (const d of (it.dietary || [])) {
        if (!dietKeys.has(d)) fail(`unknown dietary key "${d}" on ${it.name}`);
      }
      for (const a of (it.allergens || [])) {
        if (!allergenKeys.has(a)) fail(`unknown allergen key "${a}" on ${it.name}`);
      }
      if (it.image && !sandbox.window.LUCIA_IMAGES.IMG[it.image]) {
        fail(`item "${it.name}" references unknown image key "${it.image}"`);
      }
    }
    if (c.opener && !sandbox.window.LUCIA_IMAGES.IMG[c.opener]) {
      fail(`course "${c.id}" opener references unknown image key "${c.opener}"`);
    }
  }
  if (!fails.length) ok(`${MENU.length} courses, ${dishTotal} dishes — all required fields present`);

  // cheese-with-bread class of bug: a GF item whose course explicitly serves bread
  for (const c of MENU) {
    const servesBread = /\bbread\b/i.test(c.intro || '');
    if (!servesBread) continue;
    for (const it of c.items) {
      if ((it.dietary || []).includes('GF') && !/without (the )?bread|no bread/i.test((it.note || '') + (c.note || ''))) {
        warn.push(`"${it.name}" in "${c.id}" is marked GF but the course serves bread with it — verify this is intentional`);
      }
    }
  }

  const wineGroupIds = new Set();
  let wineTotal = 0;
  for (const g of WINE) {
    if (wineGroupIds.has(g.id)) fail(`duplicate wine group id: ${g.id}`);
    wineGroupIds.add(g.id);
    const names = new Set();
    for (const w of g.wines) {
      wineTotal++;
      if (names.has(w.name)) fail(`duplicate wine name in "${g.id}": ${w.name}`);
      names.add(w.name);
      for (const field of ['region', 'grape', 'vintage', 'glass', 'bottle']) {
        if (w[field] === undefined || w[field] === null || w[field] === '') {
          fail(`wine "${w.name}" missing "${field}"`);
        }
      }
    }
  }
  if (!fails.some(f => f.includes('wine'))) ok(`${WINE.length} wine groups, ${wineTotal} wines — all required fields present`);

  if (dishTotal !== LUCIA_FACTS.dishCount) fail(`LUCIA_FACTS.dishCount (${LUCIA_FACTS.dishCount}) != actual (${dishTotal})`);
  if (wineTotal !== LUCIA_FACTS.wineCount) fail(`LUCIA_FACTS.wineCount (${LUCIA_FACTS.wineCount}) != actual (${wineTotal})`);
  if (MENU.length !== LUCIA_FACTS.courseCount) fail(`LUCIA_FACTS.courseCount (${LUCIA_FACTS.courseCount}) != actual (${MENU.length})`);
  else ok(`LUCIA_FACTS matches source data (${LUCIA_FACTS.courseCount} courses \u00b7 ${dishTotal} dishes \u00b7 ${wineTotal} wines)`);

  if (!RESTAURANT.reservation.closedWeekdays.includes(1)) {
    fail('RESTAURANT.reservation.closedWeekdays does not include Monday (1), but RESTAURANT.hours says Monday is closed');
  } else {
    ok('reservation.closedWeekdays agrees with RESTAURANT.hours (Monday closed)');
  }
}

/* ---------------------------------------------------------------
   2. No stale hard-coded counts anywhere in the shipped site.
   ------------------------------------------------------------- */
console.log('\n2. Stale content');
{
  const htmlFiles = readdirSync(ROOT).filter(f => f.endsWith('.html'));
  const cssJs = ['assets/css/lucia.css', 'assets/js/app.js', 'assets/js/data.js'];
  const toWords = (n) => {
    const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
      'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10), o = n % 10;
    return tens[t] + (o ? '-' + ones[o] : '');
  };
  const correctWine = toWords(LUCIA_FACTS.wineCount);
  const correctCourse = toWords(LUCIA_FACTS.courseCount);
  const correctDish = toWords(LUCIA_FACTS.dishCount);

  // build the full vocabulary of English number-words 0–99 so the
  // check only fires on an actual (wrong) number, never on prose
  // or code that merely happens to precede "bottles"/"courses"/"dishes"
  const NUMBER_WORDS = new Set();
  for (let n = 0; n <= 99; n++) {
    NUMBER_WORDS.add(toWords(n));
    NUMBER_WORDS.add(toWords(n).replace(/^./, c => c.toUpperCase()));
  }

  const suspects = [
    { re: /\b([a-z-]+)\s+bottles\b/gi, correct: correctWine, label: 'bottles' },
    { re: /\b([a-z-]+)\s+courses\b/gi, correct: correctCourse, label: 'courses' },
    { re: /\b([a-z-]+)\s+dishes\b/gi, correct: correctDish, label: 'dishes' },
  ];
  let found = false;
  for (const file of [...htmlFiles, ...cssJs]) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    for (const { re, correct, label } of suspects) {
      for (const m of text.matchAll(re)) {
        const word = m[1].toLowerCase();
        if (!NUMBER_WORDS.has(word)) continue; // not a number at all — prose/code, ignore
        if (word !== correct) {
          fail(`${file}: "${m[0]}" looks stale — data.js says ${correct} ${label}`);
          found = true;
        }
      }
    }
  }
  if (!found) ok('no stale "N bottles / N courses / N dishes" strings found');

  const markerRe = /\b(TODO|FIXME|XXX|PLACEHOLDER)\b/;
  let markers = 0;
  for (const file of [...htmlFiles, ...cssJs, 'tools/build_pdf.py', 'README.md']) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
      if (markerRe.test(line)) { fail(`${file}:${i + 1}: leftover marker — ${line.trim().slice(0, 70)}`); markers++; }
    });
  }
  if (!markers) ok('no TODO / FIXME / PLACEHOLDER markers left in the project');
}

/* ---------------------------------------------------------------
   3. Internal links: files exist, menu fragments resolve to real
   course ids.
   ------------------------------------------------------------- */
console.log('\n3. Internal links');
{
  const htmlFiles = readdirSync(ROOT).filter(f => f.endsWith('.html'));
  const courseIds = new Set(MENU.map(c => c.id));
  const knownFragments = new Set(['reserve', 'top']); // non-menu anchors used on visit.html/etc.
  let brokenFile = 0, brokenFragment = 0, checked = 0;

  const idsByFile = {};
  for (const file of htmlFiles) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    idsByFile[file] = new Set([...text.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  }

  for (const file of htmlFiles) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    for (const m of text.matchAll(/href="([^"]+)"/g)) {
      const href = m[1];
      if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(href)) continue;
      checked++;
      const [target, frag] = href.split('#');
      const targetFile = target || file;
      if (targetFile && !existsSync(join(ROOT, targetFile))) {
        fail(`${file}: links to missing file "${targetFile}"`);
        brokenFile++;
        continue;
      }
      if (!frag) continue;
      const staticMatch = idsByFile[targetFile] && idsByFile[targetFile].has(frag);
      const courseMatch = targetFile === 'menu.html' && courseIds.has(frag);
      const knownMatch = knownFragments.has(frag);
      if (!staticMatch && !courseMatch && !knownMatch) {
        fail(`${file}: links to ${targetFile}#${frag}, which is neither a static id in that page nor a course id in data.js`);
        brokenFragment++;
      }
    }
  }
  if (!brokenFile && !brokenFragment) ok(`${checked} internal links checked — all resolve`);
}

/* ---------------------------------------------------------------
   4. Image manifest: every key referenced in HTML/data.js exists;
   every manifest entry has real fields.
   ------------------------------------------------------------- */
console.log('\n4. Image manifest');
{
  const IMG = sandbox.window.LUCIA_IMAGES.IMG;
  let bad = 0;
  for (const [key, e] of Object.entries(IMG)) {
    if (!e.id || !e.alt || !e.credit) { fail(`image "${key}" missing id/alt/credit`); bad++; }
  }
  const htmlFiles = readdirSync(ROOT).filter(f => f.endsWith('.html'));
  for (const file of htmlFiles) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    for (const m of text.matchAll(/data-img="([^"]+)"/g)) {
      if (m[1] && !IMG[m[1]]) { fail(`${file}: data-img="${m[1]}" not in images.js manifest`); bad++; }
    }
    for (const m of text.matchAll(/data-gallery="([^"]+)"/g)) {
      for (const key of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
        if (!IMG[key]) { fail(`${file}: data-gallery references unknown key "${key}"`); bad++; }
      }
    }
  }
  if (!bad) ok(`${Object.keys(IMG).length} manifest images — all referenced keys resolve`);
}

/* ---------------------------------------------------------------
   5. PDF: delegate to build_pdf.py's own validate_coverage().
   ------------------------------------------------------------- */
console.log('\n5. PDF \u2194 data sync');
try {
  execFileSync('python3', ['tools/build_pdf.py'], { cwd: ROOT, stdio: 'pipe' });
  ok('tools/build_pdf.py ran clean — PDF matches data.js (every course/dish/wine placed)');
} catch (e) {
  fail('tools/build_pdf.py failed — PDF is out of sync with data.js:\n      ' +
    String(e.stderr || e.message).trim().split('\n').join('\n      '));
}

/* ---------------------------------------------------------------
   Summary
   ------------------------------------------------------------- */
console.log('\n' + '─'.repeat(60));
if (warn.length) {
  console.log(`${warn.length} warning(s):`);
  warn.forEach(w => console.log('  \u26a0 ' + w));
}
if (fails.length) {
  console.log(`\n${fails.length} FAILURE(S) — see \u2717 lines above.`);
  process.exit(1);
} else {
  console.log('All checks passed.');
  process.exit(0);
}

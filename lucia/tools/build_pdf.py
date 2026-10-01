#!/usr/bin/env python3
"""
LUCIA — printed menu generator
==============================

Renders menu/LUCIA-Menu.pdf at A4 portrait, twelve pages, designed for the
table rather than the screen.

The menu content is NOT duplicated here. This script reads the same
assets/js/data.js that the website uses, so a price changed in one place
changes in both. Run it again after any edit:

    python3 tools/build_pdf.py

If tools/fetch-images.sh has been run, the photographs in assets/img are
placed on the cover and the section openers. Without them the menu falls
back to its typographic setting, which is how it is designed to read in
the first place.
"""

import json
import os
import re
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS = os.path.join(ROOT, 'assets', 'js', 'data.js')
IMG_DIR = os.path.join(ROOT, 'assets', 'img')
OUT = os.path.join(ROOT, 'menu', 'LUCIA-Menu.pdf')

# ═══════════════════════════════════════════════════════════════
#  1. READ THE WEBSITE'S OWN DATA FILE
# ═══════════════════════════════════════════════════════════════

def strip_comments(src):
    """Remove // and /* */ comments without touching string literals."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c in '"\'':
            q = c
            out.append(c); i += 1
            while i < n:
                out.append(src[i])
                if src[i] == '\\':
                    i += 1
                    if i < n:
                        out.append(src[i])
                    i += 1
                    continue
                if src[i] == q:
                    i += 1
                    break
                i += 1
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            while i < n and src[i] != '\n':
                i += 1
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            i += 2
            while i + 1 < n and not (src[i] == '*' and src[i + 1] == '/'):
                i += 1
            i += 2
            continue
        out.append(c); i += 1
    return ''.join(out)


def extract_literal(src, name):
    """Pull `const NAME = <literal>;` out by bracket matching."""
    m = re.search(r'const\s+' + name + r'\s*=\s*', src)
    if not m:
        raise SystemExit('Could not find %s in data.js' % name)
    i = m.end()
    opener = src[i]
    closer = {'[': ']', '{': '}'}[opener]
    depth, j, n = 0, i, len(src)
    while j < n:
        c = src[j]
        if c in '"\'':
            q = c; j += 1
            while j < n:
                if src[j] == '\\':
                    j += 2; continue
                if src[j] == q:
                    break
                j += 1
        elif c == opener:
            depth += 1
        elif c == closer:
            depth -= 1
            if depth == 0:
                return src[i:j + 1]
        j += 1
    raise SystemExit('Unbalanced literal for %s' % name)


def js_to_json(lit):
    """Convert a JS object/array literal to strict JSON."""
    out, i, n = [], 0, len(lit)
    while i < n:
        c = lit[i]

        # single-quoted string -> double-quoted JSON string
        if c == "'":
            i += 1
            buf = []
            while i < n and lit[i] != "'":
                if lit[i] == '\\':
                    nxt = lit[i + 1]
                    if nxt == "'":
                        buf.append("'")
                    else:
                        buf.append('\\' + nxt)
                    i += 2
                    continue
                if lit[i] == '"':
                    buf.append('\\"')
                else:
                    buf.append(lit[i])
                i += 1
            i += 1
            out.append('"' + ''.join(buf) + '"')
            continue

        # double-quoted string passes through verbatim
        if c == '"':
            out.append(c); i += 1
            while i < n:
                out.append(lit[i])
                if lit[i] == '\\':
                    i += 1
                    if i < n:
                        out.append(lit[i])
                    i += 1
                    continue
                if lit[i] == '"':
                    i += 1
                    break
                i += 1
            continue

        # bare identifier used as a key -> quoted key
        if c.isalpha() or c == '_':
            j = i
            while j < n and (lit[j].isalnum() or lit[j] in '_$'):
                j += 1
            word = lit[i:j]
            k = j
            while k < n and lit[k] in ' \t\r\n':
                k += 1
            if k < n and lit[k] == ':':
                out.append('"' + word + '"')
            else:
                out.append(word)  # true / false / null
            i = j
            continue

        out.append(c); i += 1

    txt = ''.join(out)
    txt = re.sub(r',(\s*[}\]])', r'\1', txt)          # trailing commas
    txt = re.sub(r'\+\s*\n?\s*"', '', txt)            # JS string concatenation
    return txt


src = strip_comments(open(DATA_JS, encoding='utf-8').read())
MENU = json.loads(js_to_json(extract_literal(src, 'MENU')))
WINE = json.loads(js_to_json(extract_literal(src, 'WINE')))
REST = json.loads(js_to_json(extract_literal(src, 'RESTAURANT')))
LEGEND = json.loads(js_to_json(extract_literal(src, 'DIETARY_LEGEND')))
COURSE = {c['id']: c for c in MENU}

# Populated by Page.head()/.items() and wine_page() as pages are
# authored, then checked at the end of build() against MENU/WINE so
# a new section or dish can never silently go missing from print.
DRAWN_COURSE_IDS = set()
DRAWN_ITEM_NAMES = set()
DRAWN_WINE_NAMES = set()

# ═══════════════════════════════════════════════════════════════
#  2. THE PRINTED IDENTITY
# ═══════════════════════════════════════════════════════════════

PW, PH = A4                       # 595.28 × 841.89 pt

M_L = 62
M_R = 62
M_T = 70
M_B = 64
COL_W = PW - M_L - M_R

# old money, on paper
IVORY       = (0.953, 0.926, 0.874)
IVORY_DEEP  = (0.925, 0.886, 0.816)
INK         = (0.106, 0.086, 0.075)
INK_SOFT    = (0.322, 0.259, 0.220)
INK_FAINT   = (0.518, 0.463, 0.400)
CLARET      = (0.416, 0.153, 0.200)
CLARET_DEEP = (0.298, 0.106, 0.141)
BRASS       = (0.663, 0.545, 0.310)
BRASS_LIGHT = (0.784, 0.675, 0.447)
OLIVE       = (0.463, 0.455, 0.314)
BOTTLE      = (0.118, 0.161, 0.133)

SERIF   = 'Times-Roman'
SERIF_I = 'Times-Italic'
SERIF_B = 'Times-Bold'
SANS    = 'Helvetica'
SANS_B  = 'Helvetica-Bold'

EURO = '\u20ac'


def money(v):
    return str(int(v)) if float(v) == int(v) else ('%.2f' % v)


# ═══════════════════════════════════════════════════════════════
#  3. DRAWING PRIMITIVES
# ═══════════════════════════════════════════════════════════════

class Menu:
    def __init__(self, path):
        self.c = canvas.Canvas(path, pagesize=A4)
        self.c.setTitle('LUCIA — Menu')
        self.c.setAuthor('LUCIA, Porto Selva')
        self.c.setSubject('Modern Mediterranean — food and wine list')
        self.c.setCreator('LUCIA identity system')
        self.page = 0

    # -- low level ------------------------------------------------
    def fill(self, rgb):
        self.c.setFillColorRGB(*rgb)

    def stroke(self, rgb):
        self.c.setStrokeColorRGB(*rgb)

    def bg(self, rgb):
        self.fill(rgb)
        self.c.rect(0, 0, PW, PH, stroke=0, fill=1)

    def rule(self, x, y, w, rgb=None, lw=0.5, alpha=1.0):
        self.c.saveState()
        self.stroke(rgb or INK)
        self.c.setLineWidth(lw)
        if alpha < 1:
            self.c.setStrokeAlpha(alpha)
        self.c.line(x, y, x + w, y)
        self.c.restoreState()

    def text(self, x, y, s, font=SERIF, size=10, rgb=INK, space=0, align='l'):
        """Draw a single line. align: l | r | c"""
        w = pdfmetrics.stringWidth(s, font, size) + space * max(len(s) - 1, 0)
        if align == 'r':
            x -= w
        elif align == 'c':
            x -= w / 2
        t = self.c.beginText()
        t.setTextOrigin(x, y)
        t.setFont(font, size)
        self.c.setFillColorRGB(*rgb)
        if space:
            t.setCharSpace(space)
        t.textOut(s)
        if space:
            t.setCharSpace(0)
        self.c.drawText(t)
        return w

    def width(self, s, font, size, space=0):
        return pdfmetrics.stringWidth(s, font, size) + space * max(len(s) - 1, 0)

    def wrap(self, s, font, size, maxw):
        words, lines, cur = s.split(), [], ''
        for w in words:
            trial = (cur + ' ' + w).strip()
            if pdfmetrics.stringWidth(trial, font, size) <= maxw or not cur:
                cur = trial
            else:
                lines.append(cur); cur = w
        if cur:
            lines.append(cur)
        return lines

    def para(self, x, y, s, font=SERIF_I, size=9.4, rgb=INK_FAINT, maxw=None, leading=13):
        maxw = maxw or COL_W
        for line in self.wrap(s, font, size, maxw):
            self.text(x, y, line, font, size, rgb)
            y -= leading
        return y

    # -- the monogram --------------------------------------------
    def mark(self, cx, cy, size=22, rgb=BRASS, lw=0.7):
        h = size / 2.0
        self.c.saveState()
        self.stroke(rgb)
        self.c.setLineWidth(lw)
        self.c.rect(cx - h, cy - h, size, size, stroke=1, fill=0)
        self.c.setLineWidth(lw * 1.9)
        p = self.c.beginPath()
        p.moveTo(cx - size * 0.16, cy + size * 0.245)
        p.lineTo(cx - size * 0.16, cy - size * 0.19)
        p.lineTo(cx + size * 0.185, cy - size * 0.19)
        self.c.drawPath(p, stroke=1, fill=0)
        self.c.setLineWidth(lw * 0.75)
        self.c.setStrokeAlpha(0.7)
        self.c.line(cx - size * 0.33, cy + size * 0.025, cx + size * 0.33, cy + size * 0.025)
        self.c.restoreState()

    # -- page furniture ------------------------------------------
    def new_page(self, dark=False):
        if self.page:
            self.c.showPage()
        self.page += 1
        self.bg(BOTTLE if dark else IVORY)

    def furniture(self, section_label='', dark=False):
        """Running head and foot. Page one is left bare."""
        ink = BRASS_LIGHT if dark else INK_FAINT
        faint = (0.55, 0.62, 0.56) if dark else INK_FAINT
        rule_c = BRASS if dark else INK
        y = PH - M_T + 30
        self.text(M_L, y, 'LUCIA', SANS, 6.6, ink, space=3.4)
        if section_label:
            self.text(PW - M_R, y, section_label.upper(), SANS, 6.6, faint, space=3.0, align='r')
        self.rule(M_L, y - 9, COL_W, rule_c, 0.4, 0.28 if not dark else 0.4)

        fy = M_B - 26
        self.rule(M_L, fy + 14, COL_W, rule_c, 0.4, 0.22 if not dark else 0.35)
        self.text(M_L, fy, 'PORTO SELVA', SANS, 6.0, faint, space=2.6)
        self.text(PW / 2.0, fy, '%02d' % self.page, SERIF, 8.6, ink, align='c')
        self.text(PW - M_R, fy, EURO + '  ALL PRICES IN EURO', SANS, 6.0, faint, space=2.0, align='r')

    # -- photography ---------------------------------------------
    @staticmethod
    def has_photo(key):
        return any(os.path.exists(os.path.join(IMG_DIR, key + e))
                   for e in ('.jpg', '.jpeg', '.png'))

    def photo(self, key, x, y, w, h, veil=0.0):
        """Place a local photograph if one has been fetched. Returns True if drawn."""
        for ext in ('.jpg', '.jpeg', '.png'):
            p = os.path.join(IMG_DIR, key + ext)
            if os.path.exists(p):
                try:
                    img = ImageReader(p)
                    iw, ih = img.getSize()
                    scale = max(w / iw, h / ih)
                    dw, dh = iw * scale, ih * scale
                    self.c.saveState()
                    path = self.c.beginPath()
                    path.rect(x, y, w, h)
                    self.c.clipPath(path, stroke=0, fill=0)
                    self.c.drawImage(img, x - (dw - w) / 2, y - (dh - h) / 2,
                                     dw, dh, mask='auto')
                    if veil:
                        self.c.setFillColorRGB(0.055, 0.043, 0.035)
                        self.c.setFillAlpha(veil)
                        self.c.rect(x, y, w, h, stroke=0, fill=1)
                        self.c.setFillAlpha(1)
                    self.c.restoreState()
                    return True
                except Exception:
                    return False
        return False


# ═══════════════════════════════════════════════════════════════
#  4. THE PAGE ENGINE
#     Each page is described as a list of blocks, measured, then
#     set at whichever type size and leading fills the column
#     properly. A menu page with five dishes should look composed,
#     not half empty.
# ═══════════════════════════════════════════════════════════════

# three settings, from dense to grand
TIERS = [
    dict(nm=7.4,  de=8.8,  pr=10.6, dlead=10.6, dgap=6.4,  title=22, kick=6.0,
         intro=9.0, ilead=12.2, tsp=4.6, nsp=1.4),
    dict(nm=7.9,  de=9.3,  pr=11.2, dlead=11.4, dgap=9.6,  title=25, kick=6.4,
         intro=9.6, ilead=13.2, tsp=5.2, nsp=1.55),
    dict(nm=8.6,  de=10.2, pr=12.4, dlead=12.6, dgap=12.5, title=28, kick=6.8,
         intro=10.4, ilead=14.4, tsp=5.8, nsp=1.7),
    dict(nm=9.4,  de=11.1, pr=13.6, dlead=13.8, dgap=16.0, title=31, kick=7.2,
         intro=11.2, ilead=15.6, tsp=6.4, nsp=1.9),
]

# section headings are identical on every page; only the dish setting flexes
HEAD = dict(title=26, kick=6.4, intro=9.8, ilead=13.4, tsp=5.4)

AVAIL_TOP = PH - M_T
AVAIL_BOT = M_B + 26          # clear of the running foot
AVAIL_H = AVAIL_TOP - AVAIL_BOT


class Page:
    """Collects blocks, measures them, then draws them justified."""

    def __init__(self, m, label='', dark=False, col_w=COL_W, x=M_L):
        self.m = m
        self.label = label
        self.dark = dark
        self.x = x
        self.w = col_w
        self.blocks = []

    # -- authoring ------------------------------------------------
    def head(self, course):
        DRAWN_COURSE_IDS.add(course['id'])
        self.blocks.append(('head', course)); return self

    def item(self, it):
        self.blocks.append(('item', it)); return self

    def items(self, course_id):
        DRAWN_COURSE_IDS.add(course_id)
        for it in COURSE[course_id]['items']:
            self.item(it)
            DRAWN_ITEM_NAMES.add((course_id, it['name']))
        return self

    def note(self, title, body):
        self.blocks.append(('note', (title, body))); return self

    def sep(self):
        self.blocks.append(('sep', None)); return self

    def photo(self, key, h):
        self.blocks.append(('photo', (key, h))); return self

    def space(self, h):
        self.blocks.append(('space', h)); return self

    # -- measuring ------------------------------------------------
    def measure(self, T):
        m, total, gaps = self.m, 0.0, 0
        for kind, payload in self.blocks:
            if kind == 'head':
                c = payload
                h = 0
                if c.get('kicker'):
                    h += HEAD['kick'] * 2.6 + 6
                h += HEAD['title'] * 0.52 + 13 + 19
                if c.get('intro'):
                    h += len(m.wrap(c['intro'], SERIF_I, HEAD['intro'], self.w * 0.78)) * HEAD['ilead'] + 7
                total += h
                gaps += 1
            elif kind == 'item':
                it = payload
                h = T['dlead']
                if it.get('description'):
                    h += len(m.wrap(it['description'], SERIF_I, T['de'], self.w - 74)) * T['dlead'] + T['dgap']
                else:
                    h += T['dgap'] - 1
                total += h
                gaps += 1
            elif kind == 'note':
                t, b = payload
                total += 17 + len(m.wrap(b, SERIF_I, HEAD['intro'], self.w * 0.74)) * HEAD['ilead'] + 12
                gaps += 1
            elif kind == 'sep':
                total += 30
            elif kind == 'photo':
                key, h = payload
                if m.has_photo(key):
                    total += h + 28
            elif kind == 'space':
                total += payload
        return total, max(gaps - 1, 1)

    # -- drawing --------------------------------------------------
    def render(self):
        m = self.m
        m.new_page(dark=self.dark)
        m.furniture(self.label, dark=self.dark)

        # choose the largest setting that still fits comfortably
        T = TIERS[0]
        chosen_nat = None
        for tier in TIERS:
            nat, gaps = self.measure(tier)
            if nat <= AVAIL_H * 0.97:
                T, chosen_nat = tier, (nat, gaps)
            else:
                break
        if chosen_nat is None:
            T = TIERS[0]
            chosen_nat = self.measure(T)
        nat, gaps = chosen_nat

        if nat > AVAIL_H:
            sys.stderr.write('  ! page %d (%s) overflows by %.0fpt\n'
                             % (m.page + 1, self.label, nat - AVAIL_H))

        slack = max(AVAIL_H - nat, 0)
        extra = min(slack / gaps, 38.0)
        # whatever is still left is shared between the top and the foot, so a
        # short page reads as composed rather than as a page that ran out
        residual = max(slack - extra * gaps, 0)
        y = AVAIL_TOP - min(residual * 0.50, 90)
        for kind, payload in self.blocks:
            if kind == 'head':
                y = self._head(y, payload, T)
                y -= extra * 0.45
            elif kind == 'item':
                y = self._item(y, payload, T)
                y -= extra
            elif kind == 'note':
                y = self._note(y, payload, T)
                y -= extra * 0.5
            elif kind == 'sep':
                y -= 4
                m.rule(self.x + self.w / 2 - 26, y, 52, BRASS if self.dark else INK,
                       0.45, 0.55 if self.dark else 0.32)
                y -= 26
            elif kind == 'photo':
                key, h = payload
                if m.photo(key, self.x, y - h, self.w, h):
                    y -= h + 28
            elif kind == 'space':
                y -= payload

        # any remaining air is closed by the monogram, as on a printed card
        if y - AVAIL_BOT > 74:
            m.mark(self.x + self.w / 2, AVAIL_BOT + 26, 17,
                   BRASS if self.dark else (0.72, 0.64, 0.52), 0.55)
        return self

    # -- block renderers ------------------------------------------
    def _head(self, y, course, T):
        m = self.m
        title_c = BRASS_LIGHT if self.dark else CLARET
        body_c = (0.70, 0.75, 0.70) if self.dark else INK_SOFT

        if course.get('kicker'):
            m.text(self.x, y, course['kicker'].upper(), SANS, HEAD['kick'], BRASS, space=2.8)
            y -= HEAD['kick'] * 2.6 + 6

        m.text(self.x, y, course['title'].upper(), SERIF, HEAD['title'], title_c, space=HEAD['tsp'])
        y -= HEAD['title'] * 0.52
        m.rule(self.x, y, self.w, BRASS, 0.7, 0.85)
        y -= 19

        if course.get('intro'):
            for line in m.wrap(course['intro'], SERIF_I, HEAD['intro'], self.w * 0.78):
                m.text(self.x, y, line, SERIF_I, HEAD['intro'], body_c)
                y -= HEAD['ilead']
            y -= 7
        return y

    def _item(self, y, item, T):
        m = self.m
        name_c = (0.93, 0.91, 0.86) if self.dark else INK
        desc_c = (0.60, 0.66, 0.61) if self.dark else INK_FAINT

        price = money(item['price'])
        pw = m.width(price, SERIF, T['pr'])

        name = item['name'].upper()
        nw = m.width(name, SANS, T['nm'], T['nsp'])
        m.text(self.x, y, name, SANS, T['nm'], name_c, space=T['nsp'])

        tx = self.x + nw + 10
        for t in item.get('dietary', []):
            tw = m.width(t, SANS, T['nm'] * 0.72, 0.7)
            if tx + tw < self.x + self.w - pw - 24:
                m.text(tx, y, t, SANS, T['nm'] * 0.72,
                       OLIVE if t != 'SP' else (0.659, 0.353, 0.235), space=0.7)
                tx += tw + 5

        dot_start, dot_end = tx + 5, self.x + self.w - pw - 9
        if dot_end - dot_start > 16:
            m.c.saveState()
            m.stroke(BRASS if self.dark else INK)
            m.c.setStrokeAlpha(0.30 if self.dark else 0.15)
            m.c.setLineWidth(0.45)
            m.c.setDash(0.5, 3.4)
            m.c.line(dot_start, y + 2.4, dot_end, y + 2.4)
            m.c.restoreState()

        m.text(self.x + self.w, y - 0.8, price, SERIF, T['pr'], name_c, align='r')
        y -= T['dlead']

        if item.get('description'):
            for line in m.wrap(item['description'], SERIF_I, T['de'], self.w - 74):
                m.text(self.x, y, line, SERIF_I, T['de'], desc_c)
                y -= T['dlead']
            y -= T['dgap']
        else:
            y -= T['dgap'] - 1
        return y

    def _note(self, y, payload, T):
        m = self.m
        title, body = payload
        m.text(self.x, y, title.upper(), SANS, 6.4, BRASS, space=2.8)
        y -= 17
        col = (0.62, 0.68, 0.63) if self.dark else INK_SOFT
        for line in m.wrap(body, SERIF_I, HEAD['intro'], self.w * 0.74):
            m.text(self.x, y, line, SERIF_I, HEAD['intro'], col)
            y -= HEAD['ilead']
        return y - 12


# -- wine is set differently: two price columns, no leaders -------

def wine_head(m, y, group, T):
    m.text(M_L, y, group['title'].upper(), SERIF, T['wt'], BRASS_LIGHT, space=5.2)
    y -= T['wt'] * 0.54
    m.rule(M_L, y, COL_W, BRASS, 0.7, 0.8)
    y -= 18
    for line in m.wrap(group['intro'], SERIF_I, T['wi'], COL_W * 0.72):
        m.text(M_L, y, line, SERIF_I, T['wi'], (0.66, 0.71, 0.66))
        y -= T['wil']
    y -= 5
    m.text(M_L + COL_W - 116, y, 'GLASS', SANS, 5.9, BRASS, space=1.9, align='r')
    m.text(M_L + COL_W, y, 'BOTTLE', SANS, 5.9, BRASS, space=1.9, align='r')
    y -= 13
    return y


def wine_row(m, y, w, T, extra=0.0):
    """Name, origin, two prices. Tasting notes live on the website, where a
    guest can open them; on paper they would clutter the list."""
    name_c = (0.94, 0.92, 0.87)
    m.text(M_L, y, w['name'], SERIF, T['wn'], name_c)
    m.text(M_L + COL_W - 116, y, money(w['glass']), SERIF, T['wp'], name_c, align='r')
    m.text(M_L + COL_W, y, money(w['bottle']), SERIF, T['wp'], name_c, align='r')
    y -= T['wn'] * 0.86

    meta = '%s  \u00b7  %s  \u00b7  %s' % (w['region'], w['grape'], w['vintage'])
    m.text(M_L, y, meta.upper(), SANS, 6.2, (0.56, 0.62, 0.57), space=1.5)
    y -= 9 + extra
    m.rule(M_L, y + 3, COL_W, BRASS, 0.4, 0.20)
    y -= 13
    return y


WINE_TIERS = [
    dict(wn=12.4, wp=10.8, wt=21, wi=9.0, wil=12.2),
    dict(wn=13.4, wp=11.4, wt=24, wi=9.6, wil=13.0),
    dict(wn=14.6, wp=12.2, wt=27, wi=10.4, wil=14.0),
]


def wine_page(m, label, group_ids, lead=None, footer=None):
    groups = [next(g for g in WINE if g['id'] == gid) for gid in group_ids]
    n = sum(len(g['wines']) for g in groups)
    head_pad = 34 if lead else 0

    for g in groups:
        for w in g['wines']:
            DRAWN_WINE_NAMES.add(w['name'])

    def natural(T):
        h = float(head_pad)
        for g in groups:
            h += T['wt'] * 0.54 + 18 + len(m.wrap(g['intro'], SERIF_I, T['wi'], COL_W * 0.72)) * T['wil'] + 5 + 13
            h += len(g['wines']) * (T['wn'] * 0.86 + 9 + 13)
            h += 14
        return h

    T = WINE_TIERS[0]
    for t in WINE_TIERS:
        if natural(t) <= AVAIL_H * 0.94:
            T = t
        else:
            break
    nat = natural(T)
    if nat > AVAIL_H:
        sys.stderr.write('  ! wine page (%s) overflows by %.0fpt\n' % (label, nat - AVAIL_H))

    slack = max(AVAIL_H - nat, 0)
    extra = min(slack / max(n, 1), 24.0)
    residual = max(slack - extra * n, 0)

    m.new_page(dark=True)
    m.furniture(label, dark=True)

    y = AVAIL_TOP - min(residual * 0.35, 70)
    if lead:
        m.text(M_L, y, lead, SANS, 6.6, BRASS, space=3.2)
        y -= 34
    for g in groups:
        y = wine_head(m, y, g, T)
        for w in g['wines']:
            y = wine_row(m, y, w, T, extra)
        y -= 14

    if footer:
        m.text(M_L, AVAIL_BOT - 6, footer, SANS, 5.9, (0.5, 0.56, 0.51), space=1.9)


# ═══════════════════════════════════════════════════════════════
#  5. BUILD
# ═══════════════════════════════════════════════════════════════

def build():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    m = Menu(OUT)

    # ── 01 · COVER ────────────────────────────────────────────
    m.new_page()
    m.fill(CLARET_DEEP)
    m.c.rect(0, 0, PW, PH, stroke=0, fill=1)
    m.photo('heroRoom', 0, 0, PW, PH, veil=0.70)

    m.c.saveState()
    m.stroke(BRASS); m.c.setLineWidth(0.7); m.c.setStrokeAlpha(0.75)
    m.c.rect(34, 34, PW - 68, PH - 68, stroke=1, fill=0)
    m.c.setLineWidth(0.35); m.c.setStrokeAlpha(0.32)
    m.c.rect(40, 40, PW - 80, PH - 80, stroke=1, fill=0)
    m.c.restoreState()

    m.mark(PW / 2, PH - 232, 38, BRASS_LIGHT, 0.9)
    m.text(PW / 2, PH - 392, 'LUCIA', SERIF, 62, (0.953, 0.926, 0.874), space=18, align='c')
    m.rule(PW / 2 - 78, PH - 428, 156, BRASS, 0.7, 0.9)
    m.text(PW / 2, PH - 458, 'A TABLE BETWEEN THE SEA AND THE CITY',
           SANS, 7.4, (0.84, 0.80, 0.74), space=3.5, align='c')
    m.text(PW / 2, PH - 506, 'MODERN MEDITERRANEAN', SANS, 6.4, BRASS_LIGHT, space=3.2, align='c')

    m.rule(PW / 2 - 42, 196, 84, BRASS, 0.4, 0.5)
    m.text(PW / 2, 166, 'Via Marina 18', SERIF_I, 12.5, (0.81, 0.77, 0.71), align='c')
    m.text(PW / 2, 147, 'Porto Selva', SERIF_I, 12.5, (0.81, 0.77, 0.71), align='c')
    m.text(PW / 2, 96, 'FOOD  \u00b7  WINE  \u00b7  THE FIRE', SANS, 6.0, (0.62, 0.55, 0.48),
           space=2.8, align='c')

    # ── 02 · APERITIVI + SMALL PLATES ─────────────────────────
    (Page(m, 'Aperitivi \u00b7 Small Plates')
        .head(COURSE['aperitivi']).items('aperitivi')
        .sep()
        .head(COURSE['small-plates']).items('small-plates')
        .render())

    # ── 03 · ANTIPASTI ────────────────────────────────────────
    (Page(m, 'Antipasti')
        .photo('mezze', 200)
        .head(COURSE['antipasti']).items('antipasti')
        .note('At the counter',
              'Everything on this page is cut to order and dressed with whichever oil arrived '
              'that month. Ask what it is \u2014 we will usually bring the tin out to show you.')
        .render())

    # ── 04 · PASTA & GRAINS ───────────────────────────────────
    feat_pasta = next(i for i in COURSE['pasta-grains']['items'] if i.get('featured'))
    (Page(m, 'Pasta & Grains')
        .head(COURSE['pasta-grains']).items('pasta-grains')
        .photo('pastaPesto', 190)
        .note('Signature \u00b7 ' + feat_pasta['name'], feat_pasta['note'])
        .render())

    # ── 05 · FROM THE SEA ─────────────────────────────────────
    (Page(m, 'From the Sea')
        .photo('fishFine', 215)
        .head(COURSE['from-the-sea']).items('from-the-sea')
        .note('Landed that morning',
              'The fish is landed at Porto Selva before service. If the boats stayed in, this page '
              'is shorter than it should be, and your waiter will say so before you order.')
        .render())

    # ── 06 · FROM THE FIRE ────────────────────────────────────
    (Page(m, 'From the Fire')
        .head(COURSE['from-the-fire']).items('from-the-fire')
        .photo('fireGrill', 200)
        .note('Olive and holm oak',
              'One grill, lit at ten in the morning and burnt down to coals by service. The lamb '
              'shoulder takes twelve hours and is meant for the middle of the table.')
        .render())

    # ── 07 · SIDES + DESSERTS ─────────────────────────────────
    (Page(m, 'Sides \u00b7 Desserts')
        .head(COURSE['sides']).items('sides')
        .sep()
        .head(COURSE['desserts']).items('desserts')
        .render())

    # ── 08 · CHEESE + COFFEE ────────────────────────────────
    (Page(m, 'Cheese \u00b7 Coffee')
        .head(COURSE['cheese']).items('cheese')
        .note('A note on the cheese', COURSE['cheese'].get('note', ''))
        .sep()
        .head(COURSE['coffee']).items('coffee')
        .render())

    # ── 09 · WATER + NOTES ───────────────────────────────────
    m.new_page()
    m.furniture('Water \u00b7 Notes')
    y = AVAIL_TOP

    c = COURSE['non-alcoholic']
    DRAWN_COURSE_IDS.add('non-alcoholic')
    m.text(M_L, y, c['kicker'].upper(), SANS, 6.4, BRASS, space=2.8); y -= 22
    m.text(M_L, y, c['title'].upper(), SERIF, 25, CLARET, space=5.2); y -= 13
    m.rule(M_L, y, COL_W, BRASS, 0.7, 0.85); y -= 24
    for it in c['items']:
        DRAWN_ITEM_NAMES.add(('non-alcoholic', it['name']))
        price = money(it['price'])
        pw = m.width(price, SERIF, 11.2)
        name = it['name'].upper()
        nw = m.width(name, SANS, 7.9, 1.55)
        m.text(M_L, y, name, SANS, 7.9, INK, space=1.55)
        m.c.saveState(); m.stroke(INK); m.c.setStrokeAlpha(0.15)
        m.c.setLineWidth(0.45); m.c.setDash(0.5, 3.4)
        m.c.line(M_L + nw + 14, y + 2.4, M_L + COL_W - pw - 9, y + 2.4)
        m.c.restoreState()
        m.text(M_L + COL_W, y - 0.8, price, SERIF, 11.2, INK, align='r')
        y -= 11.6
        if it.get('description'):
            m.text(M_L, y, it['description'], SERIF_I, 9.3, INK_FAINT)
            y -= 11.4
        y -= 9

    y -= 18
    m.rule(M_L, y + 8, COL_W, INK, 0.45, 0.25)
    y -= 26

    m.text(M_L, y, 'DIETARY MARKS', SANS, 6.4, BRASS, space=2.8)
    y -= 24
    for d in LEGEND:
        m.text(M_L, y, d['key'], SANS, 8.2,
               OLIVE if d['key'] != 'SP' else (0.659, 0.353, 0.235), space=1.5)
        m.text(M_L + 38, y, d['label'], SERIF, 11.6, INK)
        m.rule(M_L, y - 9, COL_W * 0.52, INK, 0.4, 0.12)
        y -= 23
    y -= 22

    for head, body in (
        ('Allergies',
         'Tell us when you sit down rather than when the plate arrives. Almost everything here can '
         'be adjusted, but not once it is over the fire. We cook with nuts, shellfish, gluten and '
         'dairy in one small kitchen and cannot promise the absence of traces.'),
        ('Service',
         'Prices include service and all taxes. Nothing discretionary is added to your bill. If '
         'something was not right, say so before you pay and we will take it off.'),
        ('Season',
         'This menu is set on the day it is printed. Where a dish depends on the boats or on the '
         'first pressing of the oil, it may be withdrawn without notice, which is rather the point.')):
        m.text(M_L, y, head.upper(), SANS, 6.4, BRASS, space=2.8)
        y -= 17
        y = m.para(M_L, y, body, SERIF_I, 9.5, INK_SOFT, COL_W * 0.74, 13.2)
        y -= 18
    if y < AVAIL_BOT:
        sys.stderr.write('  ! page 09 overflows by %.0fpt\n' % (AVAIL_BOT - y))

    # ── 10 & 11 · WINE ─────────────────────────────────────
    wine_page(m, 'Wine \u00b7 I', ['sparkling', 'white'], lead='THE WINE LIST')
    wine_page(m, 'Wine \u00b7 II', ['rose', 'red', 'dessert'],
              footer='GLASS POURS 150ML  \u00b7  DESSERT WINES 100ML  \u00b7  '
                     'REDS SERVED AT 16\u00b0C  \u00b7  TASTING NOTES AT LUCIA.EXAMPLE')

    # ── 12 · BACK ─────────────────────────────────────────────
    m.new_page()
    m.fill(CLARET_DEEP)
    m.c.rect(0, 0, PW, PH, stroke=0, fill=1)
    m.c.saveState()
    m.stroke(BRASS); m.c.setLineWidth(0.7); m.c.setStrokeAlpha(0.7)
    m.c.rect(34, 34, PW - 68, PH - 68, stroke=1, fill=0)
    m.c.restoreState()

    m.mark(PW / 2, PH - 156, 32, BRASS_LIGHT, 0.9)
    m.text(PW / 2, PH - 252, 'LUCIA', SERIF, 42, (0.953, 0.926, 0.874), space=14, align='c')
    m.rule(PW / 2 - 60, PH - 280, 120, BRASS, 0.6, 0.85)
    m.text(PW / 2, PH - 308, 'A TABLE BETWEEN THE SEA AND THE CITY',
           SANS, 6.8, (0.81, 0.77, 0.71), space=3.2, align='c')

    y = PH - 396
    m.text(PW / 2, y, 'FIND US', SANS, 6.2, BRASS, space=3.0, align='c'); y -= 26
    m.text(PW / 2, y, REST['address'][0], SERIF, 14, (0.92, 0.89, 0.84), align='c'); y -= 20
    m.text(PW / 2, y, REST['address'][1], SERIF, 14, (0.92, 0.89, 0.84), align='c'); y -= 48

    m.text(PW / 2, y, 'HOURS', SANS, 6.2, BRASS, space=3.0, align='c'); y -= 26
    for lab, t in (('Lunch, Tuesday to Sunday', '12:00 \u2014 15:00'),
                   ('Dinner, Tuesday to Sunday', '18:30 \u2014 23:30'),
                   ('Monday', 'Closed')):
        m.text(PW / 2 - 12, y, lab, SERIF_I, 11.2, (0.77, 0.73, 0.68), align='r')
        m.text(PW / 2 + 12, y, t, SERIF, 11.8, (0.92, 0.89, 0.84))
        y -= 21
    y -= 28

    m.text(PW / 2, y, 'CONTACT', SANS, 6.2, BRASS, space=3.0, align='c'); y -= 26
    m.text(PW / 2, y, REST['phone'], SERIF, 13.4, (0.92, 0.89, 0.84), align='c'); y -= 20
    m.text(PW / 2, y, REST['email'], SERIF, 13.4, (0.92, 0.89, 0.84), align='c')

    m.rule(PW / 2 - 40, 140, 80, BRASS, 0.4, 0.45)
    m.text(PW / 2, 114, 'LUCIA IS A FICTIONAL RESTAURANT CREATED AS A DESIGN PORTFOLIO PIECE.',
           SANS, 5.6, (0.60, 0.53, 0.47), space=1.6, align='c')
    m.text(PW / 2, 100, 'ADDRESS, TELEPHONE, EMAIL, PRODUCERS AND WINE LABELS ARE INVENTED.',
           SANS, 5.6, (0.60, 0.53, 0.47), space=1.6, align='c')

    validate_coverage()

    m.c.showPage()
    m.c.save()
    return m.page


def validate_coverage():
    """Guards against a future edit to data.js quietly going missing
    from the printed menu: every course, every dish and every wine
    that data.js defines must have actually been drawn onto a page
    somewhere in build() above. Raises rather than writing a PDF
    that has silently fallen out of sync with the data."""
    problems = []

    all_course_ids = {c['id'] for c in MENU}
    missing_courses = all_course_ids - DRAWN_COURSE_IDS
    if missing_courses:
        problems.append('course(s) never placed on any page: ' + ', '.join(sorted(missing_courses)))

    for c in MENU:
        names = {it['name'] for it in c['items']}
        drawn = {n for (cid, n) in DRAWN_ITEM_NAMES if cid == c['id']}
        missing = names - drawn
        if missing:
            problems.append('dish(es) missing from "%s": %s' % (c['id'], ', '.join(sorted(missing))))

    all_wine_names = {w['name'] for g in WINE for w in g['wines']}
    missing_wines = all_wine_names - DRAWN_WINE_NAMES
    if missing_wines:
        problems.append('wine(s) never placed on any page: ' + ', '.join(sorted(missing_wines)))

    if problems:
        raise SystemExit(
            'build_pdf: the PDF would not match assets/js/data.js —\n  - ' +
            '\n  - '.join(problems) +
            '\nAdd the missing section/page to tools/build_pdf.py\'s build() and rebuild.'
        )


if __name__ == '__main__':
    pages = build()
    print('Wrote %s \u2014 %d pages, %.1f KB'
          % (os.path.relpath(OUT, ROOT), pages, os.path.getsize(OUT) / 1024.0))

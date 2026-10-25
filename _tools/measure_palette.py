"""Measure the Rased palette from the rased.sa screenshots.
Each role is sampled from a region (coords in the 2000px-wide displayed frame, scaled to the real image).
Within a region we drop the region's background colour and near-background anti-aliasing, then take the
exact most-frequent pixel of the remaining (foreground) cluster. Nothing is averaged."""
from collections import Counter
from PIL import Image

REF = '_reference/'
def load(n):
    im = Image.open(REF + n).convert('RGB'); return im, im.size[0] / 2000

def dist(a, b): return sum((x - y) ** 2 for x, y in zip(a, b)) ** .5

def mode(img, box, fg=False, dark=False):
    im, s = img
    px = list(im.crop(tuple(int(v * s) for v in box)).getdata())
    c = Counter(px)
    if not fg: return c.most_common(1)[0][0]
    bg = c.most_common(1)[0][0]
    far = max(dist(p, bg) for p in c)
    # foreground cluster = pixels in the far 40% from the background (solid glyph cores, not AA edges)
    cand = Counter({p: n for p, n in c.items() if dist(p, bg) > 0.6 * far})
    return cand.most_common(1)[0][0]

hero, feat, foot = load('rased-home-hero.png'), load('rased-features.png'), load('rased-cta-footer.png')
roles = {
    '--brand-navy':  mode(hero, (165, 630, 320, 690)),                 # Contact Us button fill
    '--headline':    mode(hero, (145, 290, 950, 450), fg=True),        # hero headline glyphs
    '--accent-blue': mode(hero, (1232, 380, 1288, 440)),               # light illustration panel
    '--eyebrow':     mode(hero, (110, 962, 275, 990), fg=True),        # "Trusted By" eyebrow glyphs
    '--mid-blue':    mode(hero, (1590, 380, 1645, 440)),               # darker illustration panel
    '--text':        mode(hero, (155, 480, 970, 595), fg=True),        # hero body text glyphs
    '--muted':       mode(foot, (18, 607, 125, 633), fg=True),         # footer column heading "Resources"
    '--nav-link':    mode(foot, (18, 640, 175, 805), fg=True),         # footer link text
    '--section-bg':  mode(feat, (0, 100, 2000, 420)),                  # FEATURES section background
    '--page-bg':     mode(hero, (0, 100, 2000, 900)),                  # hero page background
    '--icon-tile':   mode(feat, (366, 446, 378, 456)),                 # feature icon tile fill (corner, no glyph)
    '--rule':        mode(foot, (0, 600, 2000, 608), fg=True),         # footer divider line
}
for k, v in roles.items(): print(f'{k}: #{v[0]:02X}{v[1]:02X}{v[2]:02X}  rgb{v}')

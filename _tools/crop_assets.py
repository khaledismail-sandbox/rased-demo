"""Crop the hero illustration from the rased.sa hero screenshot (rased.sa HTML is an Angular SPA with no image URLs)."""
import sys
from PIL import Image
im = Image.open('_reference/rased-home-hero.png').convert('RGB')
s = im.size[0] / 2000
im.crop((int(1215*s), int(250*s), int(1670*s), int(745*s))).save('assets/img/hero-fleet.png')
if len(sys.argv) > 1:
    W = Image.new('RGB', (5*407, 888), 'white')
    for i in range(5):
        W.paste(Image.open(f'_reference/myfleet-{i+1}.png').convert('RGB').resize((399, 888)), (i*407, 0))
    W.save(sys.argv[1])

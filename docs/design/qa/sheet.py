# Dev-only QA: crop the scene band out of 375 px stills (2x) and tile them: python sheet.py out.png a.png b.png ...
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
top, bottom = int(__import__('os').environ.get('TOP', 660)), int(__import__('os').environ.get('BOTTOM', 1080))
crops = [Image.open(f).crop((0, top, 750, bottom)) for f in files]
h = bottom - top
sheet = Image.new('RGB', (1500, h * ((len(crops) + 1) // 2)), 'white')
for i, im in enumerate(crops):
    sheet.paste(im, ((i % 2) * 750, (i // 2) * h))
sheet.save(out)

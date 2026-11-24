"""V2b: per place, a row today | a | b at 2x (land crop), a wide row at 1x (full still), and a magnified detail row.
python -I scripts/v2b/compose.py <stillsDir> <outDir> <place> ..."""
import os
import sys

from PIL import Image, ImageDraw

stills, out, *places = sys.argv[1:]
os.makedirs(out, exist_ok=True)
MODES = ['today', 'a', 'b']
NAMES = {'today': 'today', 'a': 'a: cover cells', 'b': 'b: real footprints'}


def row(images, gap=8, head=20):
    w, h = images[0][1].size
    sheet = Image.new('RGB', (len(images) * (w + gap) - gap, h + head), (245, 243, 238))
    pen = ImageDraw.Draw(sheet)
    for i, (mode, image) in enumerate(images):
        sheet.paste(image, (i * (w + gap), head))
        pen.text((i * (w + gap) + 4, 4), NAMES[mode], fill=(30, 30, 30))
    return sheet


def load(place, mode, dpr):
    return Image.open(f'{stills}/{place}-{mode}@{dpr}x.png').convert('RGB')


for place in places:
    two = [(m, load(place, m, 2)) for m in MODES]
    row([(m, i.crop((0, 2 * 330, 750, 856))) for m, i in two]).save(f'{out}/{place}-row-2x.png')
    row([(m, load(place, m, 1)) for m in MODES]).save(f'{out}/{place}-wide-1x.png')
    centre = [(m, i.crop((160, 2 * 360, 560, 830)).resize((1200, 330), Image.NEAREST)) for m, i in two]
    tall = Image.new('RGB', (1200, 3 * 352), (245, 243, 238))
    for k, pair in enumerate(centre):
        tall.paste(row([pair]), (0, k * 352))
    tall.save(f'{out}/{place}-detail-6x.png')

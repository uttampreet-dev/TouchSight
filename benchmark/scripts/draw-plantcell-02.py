"""Synthetic clean line-art plant cell (NCERT-style): cell wall, vacuole, nucleus with nucleolus, chloroplasts, mitochondrion, leader-lined labels."""
from PIL import Image, ImageDraw, ImageFont
W, H = 1600, 1500
im = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(im)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 34)
INK = 'black'
LW = 6

# cell wall: rounded rectangle
d.rounded_rectangle([420, 180, 1200, 1320], radius=140, outline=INK, width=LW + 2)
# vacuole: large irregular blob (polygon), centre-left
vac = [(520, 520), (640, 430), (800, 440), (880, 560), (860, 760), (780, 900), (640, 960), (520, 880), (470, 700)]
d.polygon(vac, outline=INK, width=LW)
# nucleus: circle right with nucleolus
d.ellipse([930, 620, 1130, 820], outline=INK, width=LW)
d.ellipse([1000, 690, 1060, 750], outline=INK, width=LW)
# chloroplasts: three ellipses
for box in ([540, 1040, 700, 1120], [740, 1120, 900, 1200], [960, 320, 1120, 400]):
    d.ellipse(box, outline=INK, width=LW)
# mitochondrion: ellipse bottom right
d.ellipse([940, 1000, 1120, 1100], outline=INK, width=LW)

def label(text, at, end, anchor='la'):
    x, y = at
    d.text((x, y), text, fill=INK, font=font, anchor=anchor)
    bbox = d.textbbox((x, y), text, font=font, anchor=anchor)
    sx = bbox[2] + 12 if end[0] > bbox[2] else bbox[0] - 12
    sy = (bbox[1] + bbox[3]) // 2
    d.line([(sx, sy), end], fill=INK, width=3)

# leaders end a little inside the part they name
label('Cell wall', (120, 300), (428, 400))
label('Vacuole', (120, 640), (560, 700))
label('Chloroplast', (120, 1090), (600, 1080))
label('Cytoplasm', (120, 1230), (640, 1260))
label('Nucleus', (1320, 560), (1080, 660), anchor='ra')
label('Nucleolus', (1320, 760), (1050, 730), anchor='ra')
label('Mitochondrion', (1320, 1100), (1060, 1050), anchor='ra')
label('Chloroplast', (1320, 300), (1080, 360), anchor='ra')
im.save('benchmark/raw/bio-plantcell-02.png')
print('wrote benchmark/raw/bio-plantcell-02.png')

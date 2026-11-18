"""Create a 1200x630 BRAMER social-sharing PNG from the approved SVG logo.

Run before the Vite build so /og-bramer.png exists in the Pages deployment.
Uses source artwork; never recreates the logo as text.
"""
from io import BytesIO
from pathlib import Path
import re
import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / 'public' / 'bramer-logo.svg'
OUTPUT = ROOT / 'public' / 'og-bramer.png'
WIDTH, HEIGHT = 1200, 630

def font_path(bold=False):
    options = (
        ['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
         '/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf']
        if bold else
        ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
         '/usr/share/fonts/truetype/nanum/NanumGothic.ttf']
    )
    for option in options:
        if Path(option).exists():
            return option
    raise FileNotFoundError('A Noto Sans CJK font is required to draw the Korean social card.')

def vector_logo(width, color):
    source = LOGO.read_text(encoding='utf-8')
    source = re.sub(
        r'<svg\s+[^>]*>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 83.58 16.8">',
        source, count=1,
    )
    source = re.sub(r'fill="#[0-9a-fA-F]{6}"', f'fill="{color}"', source)
    png = cairosvg.svg2png(bytestring=source.encode('utf-8'), output_width=width)
    return Image.open(BytesIO(png)).convert('RGBA')

def main():
    image = Image.new('RGB', (WIDTH, HEIGHT), '#101010')
    draw = ImageDraw.Draw(image)
    bold, regular = font_path(True), font_path()
    headline = ImageFont.truetype(bold, 57)
    body = ImageFont.truetype(regular, 23)
    overline = ImageFont.truetype(regular, 18)
    tiny = ImageFont.truetype(regular, 12)

    draw.text((82, 74), 'BRAND GUIDELINE CREATOR', font=overline, fill='#ADADAD')
    draw.line((82, 120, 1118, 120), fill='#323232', width=1)
    draw.text((76, 181), '로고만 있다면,', font=headline, fill='#FFFFFF')
    draw.text((76, 266), '가이드라인이 뚝딱.', font=headline, fill='#FFFFFF')
    draw.text((82, 382), '로고에서 브랜드 가이드라인까지, 하나의 흐름으로.', font=body, fill='#AAAAAA')

    # A restrained visual representation of the guideline document.
    draw.rounded_rectangle((923, 175, 1083, 416), radius=5, fill='#363636')
    draw.rounded_rectangle((896, 154, 1060, 395), radius=5, fill='#7E7E7E')
    draw.rounded_rectangle((865, 136, 1038, 378), radius=5, fill='#F4F4F4')
    draw.text((880, 157), 'BRAND', font=ImageFont.truetype(bold, 20), fill='#181818')
    draw.text((880, 180), 'GUIDELINES', font=ImageFont.truetype(bold, 20), fill='#181818')
    draw.line((882, 221, 1023, 221), fill='#BABABA', width=1)
    draw.rectangle((881, 250, 1022, 285), fill='#111111')
    draw.rectangle((881, 292, 943, 329), fill='#C0C0C0')
    draw.rectangle((951, 292, 1022, 329), fill='#E1E1E1')
    draw.text((882, 351), 'BRAMER / 2026', font=tiny, fill='#555555')

    draw.line((82, 490, 1118, 490), fill='#323232', width=1)
    logo = vector_logo(230, '#FFFFFF')
    image.paste(logo, (78, 507), logo)
    draw.text((935, 520), 'bramer.cloud', font=ImageFont.truetype(regular, 17), fill='#9C9C9C')

    image.save(OUTPUT, format='PNG', optimize=True)
    assert Image.open(OUTPUT).size == (1200, 630)
    print(f'Generated social image: {OUTPUT.name} ({OUTPUT.stat().st_size} bytes)')

if __name__ == '__main__':
    main()

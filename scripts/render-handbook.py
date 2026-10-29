"""Regenerate the in-app reader from the published PDF (requires Poppler, pypdf, Pillow)."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from PIL import Image
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'public/documents/2026-texas-universal-beauty-handbook.pdf'
pages = PdfReader(source).pages
manifest = {'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'pages': []}
with tempfile.TemporaryDirectory() as temp:
    subprocess.run(['pdftoppm', '-r', '180', '-jpeg', '-jpegopt', 'quality=85,optimize=y', str(source), str(Path(temp) / 'page')], check=True)
    images = sorted(Path(temp).glob('page-*.jpg'))
    assert len(images) == len(pages)
    for number, (page, image) in enumerate(zip(pages, images), 1):
        filename = f'handbook-page-{number:02}.jpg'
        (root / 'public/assets' / filename).write_bytes(image.read_bytes())
        with Image.open(image) as img:
            width, height = img.size
        manifest['pages'].append({'image': '/assets/' + filename, 'width': width, 'height': height, 'text': page.extract_text() or ''})
(root / 'public/data/handbook-pages.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'Rendered {len(pages)} handbook pages.')

"""Build-time download from the original publisher; runtime is fully offline."""
from pathlib import Path
from urllib.request import urlretrieve
import hashlib
import json

REVISION = '3d7cfbdacd47fdda877c5cd8a79fbcc4f2a574f3'
BASE = f'https://huggingface.co/intfloat/multilingual-e5-large/resolve/{REVISION}'
root = Path('/app/model')
root.mkdir(exist_ok=True)
manifest = {}
for remote, local in [('onnx/model_qint8_avx512_vnni.onnx', 'model.onnx'), ('tokenizer.json', 'tokenizer.json')]:
    target = root / local
    urlretrieve(f'{BASE}/{remote}', target)
    manifest[local] = hashlib.file_digest(target.open('rb'), 'sha256').hexdigest()
(root / 'manifest.json').write_text(json.dumps({'revision': REVISION, 'sha256': manifest}))

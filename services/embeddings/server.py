"""Offline E5 semantic embeddings. No telemetry, paid fallback or content logs."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import threading
import time
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

MODEL = 'local:multilingual-e5-large:3d7cfbdacd47fdda877c5cd8a79fbcc4f2a574f3:onnx-qint8-avx512-vnni:1024:tokens480:mean-v1'
MAX_BODY = 4 * 1024 * 1024
WINDOW = 480
options = ort.SessionOptions()
options.intra_op_num_threads = 1
options.inter_op_num_threads = 1
options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
session = ort.InferenceSession('/app/model/model.onnx', sess_options=options, providers=['CPUExecutionProvider'])
tokenizer = Tokenizer.from_file('/app/model/tokenizer.json')
tokenizer.no_truncation()
tokenizer.no_padding()
cls, sep = tokenizer.token_to_id('<s>'), tokenizer.token_to_id('</s>')
assert cls is not None and sep is not None
input_names = {item.name for item in session.get_inputs()}
inference_lock = threading.Lock()
requests = threading.BoundedSemaphore(8)

def input_tokens(text, kind):
    # Tokenize every character without truncation. Prefix each window as E5 requires.
    # Tokenize the complete prefixed input exactly as the publisher specifies.
    # Encoding a prefix with trailing whitespace separately adds a spurious SPM token.
    prefix = tokenizer.encode(kind + ':', add_special_tokens=False).ids
    complete = tokenizer.encode(kind + ': ' + text, add_special_tokens=False).ids
    if complete[:len(prefix)] != prefix:
        raise ValueError('INVALID_PREFIX')
    ids = complete[len(prefix):]
    if not ids:
        raise ValueError('EMPTY_EMBEDDING_INPUT')
    return prefix, ids

def embed(text, kind):
    prefix, ids = input_tokens(text, kind)
    result = np.zeros(1024, dtype=np.float64)
    windows = 0
    for start in range(0, len(ids), WINDOW):
        part = ids[start:start + WINDOW]
        encoded = np.asarray([[cls, *prefix, *part, sep]], dtype=np.int64)
        assert encoded.shape[1] <= 512
        inputs = {'input_ids': encoded, 'attention_mask': np.ones_like(encoded), 'token_type_ids': np.zeros_like(encoded)}
        # Release between windows so a large indexing request cannot monopolize the model.
        with inference_lock:
            hidden = session.run(None, {k: v for k, v in inputs.items() if k in input_names})[0]
        pooled = hidden[0].mean(axis=0)
        pooled = pooled / np.linalg.norm(pooled)
        result += pooled * len(part)
        windows += 1
    result /= np.linalg.norm(result)
    if result.shape != (1024,) or not np.isfinite(result).all():
        raise ValueError('INVALID_VECTOR')
    return result.tolist(), windows, len(ids)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def respond(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.respond(200 if self.path == '/health' else 404, {'model': MODEL, 'status': 'ok'} if self.path == '/health' else {'error': 'NOT_FOUND'})

    def do_POST(self):
        if self.path != '/embed':
            return self.respond(404, {'error': 'NOT_FOUND'})
        if not requests.acquire(blocking=False):
            return self.respond(503, {'error': 'EMBEDDING_BUSY'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= MAX_BODY:
                return self.respond(413, {'error': 'INPUT_TOO_LARGE'})
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict) or set(data) != {'text', 'kind'} or not isinstance(data.get('text'), str) or not data['text'].strip() or data.get('kind') not in ['query', 'passage']:
                return self.respond(400, {'error': 'INVALID_INPUT'})
            start = time.monotonic()
            vector, windows, tokens = embed(data['text'], data['kind'])
            self.respond(200, {'model': MODEL, 'vector': vector, 'windows': windows, 'tokens': tokens, 'elapsedMs': round((time.monotonic() - start) * 1000)})
        except (ValueError, TypeError):
            self.respond(400, {'error': 'INVALID_INPUT'})
        except (BrokenPipeError, TimeoutError):
            pass
        except Exception:
            self.respond(500, {'error': 'LOCAL_EMBEDDING_FAILED'})
        finally:
            requests.release()

if __name__ == '__main__':
    print(json.dumps({'ready': True, 'model': MODEL, 'provider': session.get_providers()}), flush=True)
    ThreadingHTTPServer(('0.0.0.0', 8080), Handler).serve_forever()

"""Run inside an isolated model container; never contacts model vendors or customer data."""
import concurrent.futures
import json
import time
import urllib.request
import urllib.error

URL = 'http://127.0.0.1:8080'

def request(text, kind='query'):
    start = time.monotonic()
    req = urllib.request.Request(URL+'/embed', json.dumps({'text':text,'kind':kind}).encode(), {'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=120) as response:
        data = json.load(response)
    assert len(data['vector']) == 1024
    assert abs(sum(n*n for n in data['vector']) - 1) < 1e-5
    return {'ms':round((time.monotonic()-start)*1000,2),'tokens':data['tokens'],'windows':data['windows']}

query = 'Como solicitar a devolução de um bem emprestado gratuitamente?'
single = [request(query) for _ in range(10)]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    concurrent = list(pool.map(lambda _:request(query), range(12)))
for body, expected in [({'text':'','kind':'query'},400),({'text':'test','kind':'bad'},400)]:
    try:
        urllib.request.urlopen(urllib.request.Request(URL+'/embed',json.dumps(body).encode(),{'Content-Type':'application/json'}))
        raise AssertionError('Invalid input accepted')
    except urllib.error.HTTPError as e:
        assert e.code == expected
def stats(values):
    ms = sorted(x['ms'] for x in values)
    return {'count':len(ms),'medianMs':ms[len(ms)//2],'p95Ms':ms[min(len(ms)-1,int(len(ms)*.95))],'maxMs':max(ms)}
print(json.dumps({'serial':stats(single),'concurrency4':stats(concurrent),'validation':'passed'}))

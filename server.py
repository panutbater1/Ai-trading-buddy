#!/usr/bin/env python3
"""Pip's local backend: keeps API keys in .env and forwards calls for the extension.

Run it with:  python3 server.py
Only the standard library is used, so there is nothing to install.

Endpoints (all on http://127.0.0.1:8787):
  GET  /health                -> which keys are set
  GET  /quote?symbol=AAPL     -> latest Finnhub quote
  GET  /search?q=apple        -> Finnhub symbol search
  POST /claude                -> {system, messages, max_tokens} forwarded to Claude
"""
import functools
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

print = functools.partial(print, flush=True)  # show log lines right away

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = 'claude-sonnet-5-5'
MAX_BODY = 20 * 1024 * 1024  # screenshots are sent as base64, so allow a few MB


def load_env(path):
    """Read KEY=value lines from .env. Real environment variables win."""
    env = {}
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                env[key.strip()] = value.strip().strip('"').strip("'")
    env.update({k: v for k, v in os.environ.items() if k in env})
    return env


ENV = load_env(os.path.join(HERE, '.env'))
FINNHUB_KEY = ENV.get('FINNHUB_API_KEY', '')
ANTHROPIC_KEY = ENV.get('ANTHROPIC_API_KEY', '')
PORT = int(ENV.get('PORT') or 8787)


class UpstreamError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def fetch_json(url, data=None, headers=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        raise UpstreamError(e.code, e.read().decode('utf-8', 'replace')[:500])
    except urllib.error.URLError as e:
        raise UpstreamError(502, f'Could not reach {urllib.parse.urlsplit(url).hostname}: {e.reason}')


def finnhub(path, **params):
    if not FINNHUB_KEY:
        raise UpstreamError(503, 'FINNHUB_API_KEY is missing from .env')
    query = urllib.parse.urlencode(params)
    return fetch_json(f'https://finnhub.io/api/v1/{path}?{query}', headers={'X-Finnhub-Token': FINNHUB_KEY}, timeout=15)


def quote(symbol):
    q = finnhub('quote', symbol=symbol)
    # Finnhub answers unknown symbols with all zeros instead of an error.
    if not q.get('t'):
        raise UpstreamError(404, f'No quote found for "{symbol}". Check the ticker symbol.')
    return {
        'symbol': symbol, 'price': q['c'], 'change': q['d'], 'changePct': q['dp'],
        'high': q['h'], 'low': q['l'], 'open': q['o'], 'prevClose': q['pc'], 'time': q['t'],
    }


def search(text):
    data = finnhub('search', q=text)
    return [{'symbol': r['symbol'], 'name': r['description'], 'type': r['type']} for r in data.get('result', [])[:10]]


def claude(body):
    if not ANTHROPIC_KEY:
        raise UpstreamError(503, 'ANTHROPIC_API_KEY is missing from .env')
    payload = {
        'model': MODEL,
        'max_tokens': min(int(body.get('max_tokens', 1000)), 4000),
        'system': body.get('system', ''),
        'messages': body['messages'],
    }
    data = fetch_json('https://api.anthropic.com/v1/messages', data=json.dumps(payload).encode(), headers={
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
    }, timeout=120)
    return ''.join(b['text'] for b in data.get('content', []) if b.get('type') == 'text')


class Handler(BaseHTTPRequestHandler):
    def allowed(self):
        # Only the Chrome extension (or local tools like curl, which send no Origin) may use the keys.
        # Ordinary websites send their own Origin and are turned away, so they can't spend your credits.
        origin = self.headers.get('Origin')
        return origin is None or origin.startswith('chrome-extension://')

    def send(self, status, obj):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(body)))
        if self.headers.get('Origin'):
            self.send_header('access-control-allow-origin', self.headers['Origin'])
        self.end_headers()
        self.wfile.write(body)

    def route(self, method):
        if not self.allowed():
            return self.send(403, {'error': 'Only the Pip extension can use this server.'})
        url = urllib.parse.urlsplit(self.path)
        args = {k: v[0] for k, v in urllib.parse.parse_qs(url.query).items()}
        try:
            if method == 'GET' and url.path == '/health':
                return self.send(200, {'ok': True, 'finnhub': bool(FINNHUB_KEY), 'claude': bool(ANTHROPIC_KEY)})
            if method == 'GET' and url.path == '/quote':
                symbol = args.get('symbol', '').strip().upper()
                if not symbol:
                    return self.send(400, {'error': 'Add ?symbol=, like ?symbol=AAPL'})
                return self.send(200, quote(symbol))
            if method == 'GET' and url.path == '/search':
                return self.send(200, search(args.get('q', '').strip()))
            if method == 'POST' and url.path == '/claude':
                length = int(self.headers.get('content-length') or 0)
                if length > MAX_BODY:
                    return self.send(413, {'error': 'Request too large'})
                return self.send(200, {'text': claude(json.loads(self.rfile.read(length)))})
            return self.send(404, {'error': 'Not found'})
        except UpstreamError as e:
            return self.send(e.status, {'error': str(e)})
        except (ValueError, KeyError) as e:
            return self.send(400, {'error': f'Bad request: {e}'})

    def do_GET(self):
        self.route('GET')

    def do_POST(self):
        self.route('POST')

    def do_OPTIONS(self):
        if not self.allowed():
            return self.send(403, {'error': 'Only the Pip extension can use this server.'})
        self.send_response(204)
        self.send_header('access-control-allow-origin', self.headers['Origin'])
        self.send_header('access-control-allow-methods', 'GET, POST')
        self.send_header('access-control-allow-headers', 'content-type')
        self.end_headers()

    def log_message(self, fmt, *args):
        # Log the method and path only; never the query string, in case it ever holds something private.
        print(f'{self.command} {urllib.parse.urlsplit(self.path).path} -> {args[1] if len(args) > 1 else ""}')


if __name__ == '__main__':
    print(f'Pip backend on http://127.0.0.1:{PORT}')
    print(f'  Finnhub key: {"set" if FINNHUB_KEY else "MISSING"}   Anthropic key: {"set" if ANTHROPIC_KEY else "missing (Pip will use the key from Settings)"}')
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()

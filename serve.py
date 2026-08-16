#!/usr/bin/env python3
"""Dev server. Same as `python3 -m http.server`, minus the caching.

python's default handler sends no Cache-Control, so browsers heuristically
cache CSS and JS and you end up staring at a stale page after an edit. This
sends no-store on everything. Development only — a real host should cache.

    python3 serve.py [port]
"""

import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        # Aborted video streams are normal here; keep the log readable.
        sys.stderr.write('%s - %s\n' % (self.log_date_time_string(), fmt % args))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    print('Apollo Films — http://localhost:%d' % port)
    try:
        # Threading is not optional here: a single open video stream would
        # otherwise block every other request on the server.
        ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()
    except KeyboardInterrupt:
        pass

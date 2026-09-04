from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
httpd = ThreadingHTTPServer(("127.0.0.1", 8765), SimpleHTTPRequestHandler)
print("serving 8765")
httpd.serve_forever()

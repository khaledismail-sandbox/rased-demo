"""Case-sensitivity audit: every href/src/CSS url() must resolve to a real path with exact case (GitHub Pages is case-sensitive)."""
import os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SKIP = {'_reference', '_tools', '.claude'}
REF = re.compile(r'''(?:href|src)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)''')
# JS-built links: ROOT + 'path/' and ROOT + n[2] entries
JSLINK = re.compile(r"""['"]((?:platform|login|demo-request|assets)/[A-Za-z0-9_./-]*)['"]""")

def exists_exact(path):
    path = os.path.normpath(path)
    if not path.startswith(ROOT): return False
    cur = ROOT
    for part in os.path.relpath(path, ROOT).split(os.sep):
        if part in ('', '.'): continue
        if not os.path.isdir(cur) or part not in os.listdir(cur): return False
        cur = os.path.join(cur, part)
    return True

def target(base_dir, ref):
    ref = ref.split('#')[0].split('?')[0]
    if not ref or re.match(r'^(https?:|mailto:|tel:|data:|javascript:)', ref) or '+' in ref: return None
    t = os.path.join(base_dir, ref)
    if ref.endswith('/') or os.path.isdir(t): t = os.path.join(t, 'index.html')
    return t

checked, bad = 0, []
for d, dirs, files in os.walk(ROOT):
    dirs[:] = [x for x in dirs if x not in SKIP]
    for f in files:
        if not f.endswith(('.html', '.css', '.js')): continue
        p = os.path.join(d, f); s = open(p, encoding='utf-8').read()
        refs = [a or b for a, b in REF.findall(s)]
        base = d
        if f.endswith('.js'):   # JS links are relative to the site root
            refs = JSLINK.findall(s); base = ROOT
        for r in refs:
            t = target(base, r)
            if t is None: continue
            checked += 1
            if not exists_exact(t): bad.append((os.path.relpath(p, ROOT), r))
print(f'checked {checked} references, {len(bad)} case/path mismatches')
for b in bad: print('  MISMATCH', b)
sys.exit(1 if bad else 0)

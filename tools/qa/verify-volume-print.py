"""Verify every rendered row against the exported real-volume PDF. Requires pypdf."""
import json,re,sys
from collections import Counter
from pypdf import PdfReader
reader=PdfReader(sys.argv[1])
text=' '.join((page.extract_text() or '') for page in reader.pages)
normalize=lambda s:re.sub(r'\s+','',s)
flat=normalize(text)
rows=json.load(open(sys.argv[2],encoding='utf8'))
assert len(rows)==len({r['id'] for r in rows})==104
manifest=json.load(open(sys.argv[3],encoding='utf8'))
expected={detail for entry in manifest['entries'] if entry['key'].startswith('print-') for detail in entry['details']}
assert {r['id'] for r in rows}==expected,'Printed identities differ from independent manifest'
for row,n in Counter(normalize(r['text']) for r in rows).items():
    assert flat.count(row)==n,'PDF row missing/repeated: '+row
assert text.count('Confirmada')==105 # 104 rows + filter "Confirmadas".
assert '104 resultados' in text and 'Siguiente' not in text
print(len(reader.pages),'pages,104 complete rows matched by content and104 DOM identities')

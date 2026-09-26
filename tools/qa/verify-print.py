"""Verifica el fixture de printing.spec.ts en el PDF del navegador.
Uso: python verify-print.py /ruta/salida.pdf (requiere pypdf).
"""
import re
import sys
from pypdf import PdfReader

for path in sys.argv[1:]:
    reader = PdfReader(path)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    identities = re.findall(r"Clase impresa (\d+)", text)
    assert len(identities) == 121, f"{path}: conteo {len(identities)}"
    assert set(identities) == set(map(str, range(1, 122))), f"{path}: identidades incompletas"
    assert "Siguiente" not in text and "Imprimir listado diario" not in text
    assert "121 resultados" in text and "1 de marzo de 2027" in text
    print(f"{path}: {len(reader.pages)} páginas; 121 filas únicas completas; sin controles")

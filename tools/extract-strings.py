# Extrae los textos en español visibles para el jugador (para el diccionario de traducción).
import re, json, sys
files = ['src/data/rooms.ts','src/data/items.ts','src/data/documents.ts','src/dialogue/dialogues.ts','src/narrative/journal.ts','src/narrative/endings.ts','src/puzzles/puzzles.ts','src/systems/logic.ts','src/ui/puzzleUI.ts']
out = []
seen = set()
pat = re.compile(r"'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`")
for f in files:
    src = open(f).read()
    for m in pat.finditer(src):
        s = m.group(1) if m.group(1) is not None else m.group(2)
        if s is None or '${' in s: continue
        if len(s) < 3 or not re.search(r'[a-záéíóúñ]', s, re.I): continue
        if re.fullmatch(r'[a-z0-9_\-./#:]+', s): continue  # ids, claves, rutas
        if ' ' not in s and not re.search(r'[áéíóúñ¿¡]', s) and s[0].islower(): continue
        if s in seen: continue
        seen.add(s); out.append(s)
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=0)
print(len(out), sum(len(s) for s in out))

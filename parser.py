import re

file_path = r"c:\Users\amrha\AppData\Roaming\Code\copilot-terminal-output\copilot-terminal-output-0ae13f1c-77aa-49cf-b816-af951f81ceb5.txt"

with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Biome issues are separated/described by lines that specify the file path and check type, e.g.:
# packages\image-editor\src\components\panels\text-panel.tsx format ─────────────────────
# Or:
# packages\image-editor\src\components\preset-thumbnail-provider.tsx:1:1 assist/source/organizeImports  FIXABLE  ──────────

# Let's find all occurrences of lines starting with packages\ or src\ or similar paths.
# A pattern matching file paths:
# Optional whitespace, then a file path like packages\...\something.tsx or .ts, followed by format, lint, etc.
lines = text.splitlines()

files_reported = []
for line in lines:
    # Match package paths or file paths
    # Match strings containing "packages\" and ending with something like "format" or "assist/source/organizeImports" or similar
    if "packages\\" in line or "packages/" in line:
        # Check if it denotes a Biome line
        # Biome lines have "format", "lint", "assist/source/organizeImports", etc. and end/contain series of box drawing or similar characters, or just contain rule labels.
        if "format" in line or "lint" in line or "organizeImports" in line or "FIXABLE" in line or "â”" in line or "──" in line:
            files_reported.append(line.strip())

for f in files_reported[:50]:
    print(f)
print("Total found reported headers:", len(files_reported))

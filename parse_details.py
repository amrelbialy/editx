import re

file_path = r"c:\Users\amrha\AppData\Roaming\Code\copilot-terminal-output\copilot-terminal-output-0ae13f1c-77aa-49cf-b816-af951f81ceb5.txt"

with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Let's write a parser to extract headers and the diagnostics associated/following each header.
# A file block starts with a line like:
# "packages\path\to\file.tsx format ━━━━━" or formatted differently.
# Or: "packages\path\to\file.tsx:line:col lint/rule or assist/source/organizeImports ━━━━━"

lines = text.splitlines()
blocks = []
current_block = []

for line in lines:
    # Look for files and actions/rules
    # We can detect headers containing 'packages\\'
    if 'packages\\' in line and ('format' in line or 'assist/source' in line or 'lint' in line or 'FIXABLE' in line or '━━' in line or '──' in line or 'â”' in line):
        if current_block:
            blocks.append(current_block)
        current_block = [line]
    else:
        if current_block:
            current_block.append(line)

if current_block:
    blocks.append(current_block)

print(f"Total blocks found: {len(blocks)}")
for i, block in enumerate(blocks):
    header = block[0].strip()
    # Clean the header
    header_clean = re.sub(r'[\s━─â”\x1b\[\]]+', ' ', header).strip()
    print(f"Block {i+1}: {header_clean}")
    # Print the next few lines of the block (up to 5) to see the error details
    for line in block[1:7]:
        line_clean = re.sub(r'[\s━─â”\x1b\[\]]+', ' ', line).strip()
        if line_clean:
            print(f"  {line_clean}")

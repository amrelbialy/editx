import re

file_path = r"c:\Users\amrha\AppData\Roaming\Code\copilot-terminal-output\copilot-terminal-output-0ae13f1c-77aa-49cf-b816-af951f81ceb5.txt"

with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Let's write a script to look for the summary section at the very end of the file.
lines = text.splitlines()
print("Printing last 50 lines of the file:")
for line in lines[-50:]:
    print(line)

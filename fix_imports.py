with open('api/index.py', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'import unicodedata' in line and 'def' not in line:
        continue
    if 'import unicodedata' in line and 'def' in line: # inside function
        continue
    if 'def normalize_header(s):' in line:
        skip = True
        continue
    if skip:
        if line.strip() == "":
            skip = False
        continue
    new_lines.append(line)

# Put at top
final_lines = ['import unicodedata\n'] + [l for l in new_lines if l.strip() != 'import unicodedata']

with open('api/index.py', 'w') as f:
    f.writelines(final_lines)

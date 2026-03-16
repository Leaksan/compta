import unicodedata
import re

with open('api/index.py', 'r') as f:
    content = f.read()

# Remove the local import and function
content = re.sub(r'        import unicodedata\n        def normalize_header\(s\):\n            if not s: return ""\n            s = str\(s\).strip\(\).lower\(\)\n            return "".join\(c for c in unicodedata.normalize\(\'NFD\', s\) if unicodedata.category\(c\) != \'Mn\'\)\n', '', content)

# Ensure import at top
if 'import unicodedata' not in content:
    content = 'import unicodedata\n' + content

# But I need normalize_header to be available globally or defined again.
# Better to define it globally.

if 'def normalize_header(s):' not in content:
    content = content.replace('import unicodedata\n', 'import unicodedata\n\ndef normalize_header(s):\n    if not s: return ""\n    s = str(s).strip().lower()\n    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")\n\n')

with open('api/index.py', 'w') as f:
    f.write(content)

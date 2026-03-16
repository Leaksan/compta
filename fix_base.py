import os

with open('api/templates/base.html', 'r') as f:
    content = f.read()

# Fix the console.log in installBtn listener
old_line = 'console.log();'
new_line = 'console.log(`User response to the install prompt: ${outcome}`);'
content = content.replace(old_line, new_line)

# Update iOS SVG to look more like the share icon (square with arrow up)
ios_svg_old = '<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>'
ios_svg_new = '<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>'
content = content.replace(ios_svg_old, ios_svg_new)

with open('api/templates/base.html', 'w') as f:
    f.write(content)

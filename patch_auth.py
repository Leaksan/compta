with open('api/templates/auth.html', 'r') as f:
    content = f.read()

pwa_tags = """  <link rel="manifest" href="/manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="/static/img/logo.jpg">
  <meta name="theme-color" content="#171717">"""

content = content.replace('<title>kaizō — Connexion</title>',
                          f'<title>kaizō — Connexion</title>\n{pwa_tags}')

sw_script = """
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
"""

content = content.replace('async function apiFetch(url, method="GET", body=null) {',
                          sw_script + '\n  async function apiFetch(url, method="GET", body=null) {')

with open('api/templates/auth.html', 'w') as f:
    f.write(content)

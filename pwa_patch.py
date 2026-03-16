import sys

with open('api/templates/base.html', 'r') as f:
    content = f.read()

# Add manifest and PWA meta tags
meta_pwa = """  <link rel="manifest" href="/manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="/static/img/logo.jpg">
  <meta name="theme-color" content="#171717">"""

content = content.replace('<title>kaizō{% block title %}{% endblock %}</title>',
                          f'<title>kaizō{{% block title %}}{{% endblock %}}</title>\n{meta_pwa}')

# Add Install UI component
install_ui = """
<!-- PWA Install Prompt -->
<div id="installPrompt" class="hidden fixed inset-x-4 bottom-24 md:bottom-8 md:right-8 md:left-auto z-50 animate-bounce">
  <div class="bg-neutral-900 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm">
    <img src="/static/img/logo.jpg" class="w-10 h-10 rounded-lg" alt="kaizō">
    <div class="flex-1">
      <p class="text-sm font-bold">Installer kaizō</p>
      <p class="text-xs text-white/60">Pour un accès rapide et hors-ligne.</p>
    </div>
    <button id="installBtn" class="bg-white text-neutral-900 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap">Installer</button>
    <button id="closeInstallBtn" class="p-1 text-white/40 hover:text-white">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  </div>
</div>

<!-- iOS Install Instruction -->
<div id="iosInstallPrompt" class="hidden fixed inset-x-4 bottom-24 z-50">
  <div class="bg-white text-neutral-900 p-5 rounded-2xl shadow-2xl border border-neutral-100 slide-up">
    <div class="flex items-start gap-4 mb-4">
      <img src="/static/img/logo.jpg" class="w-12 h-12 rounded-xl" alt="kaizō">
      <div class="flex-1">
        <p class="font-bold text-neutral-900">Installer sur iPhone</p>
        <p class="text-sm text-neutral-600">Appuyez sur le bouton de partage et sélectionnez "Sur l'écran d'accueil".</p>
      </div>
      <button onclick="document.getElementById('iosInstallPrompt').classList.add('hidden')" class="text-neutral-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="flex justify-center py-2 border-t border-neutral-50">
      <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
    </div>
  </div>
</div>
"""

content = content.replace('<div id="alertModal"', install_ui + '\n<div id="alertModal"')

# Add PWA Scripts
pwa_scripts = """
  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    });
  }

  // PWA Install Logic
  let deferredPrompt;
  const installPrompt = document.getElementById('installPrompt');
  const installBtn = document.getElementById('installBtn');
  const closeInstallBtn = document.getElementById('closeInstallBtn');
  const iosPrompt = document.getElementById('iosInstallPrompt');

  // Check if it's iOS
  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  // Check if it's already in standalone mode
  const isStandalone = () => {
    return (window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone);
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar or browser prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;

    // Check if we should show the prompt (not in standalone, not recently dismissed)
    if (!isStandalone() && !localStorage.getItem('pwaPromptDismissed')) {
      installPrompt.classList.remove('hidden');
    }
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    installPrompt.classList.add('hidden');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log();
    deferredPrompt = null;
  });

  closeInstallBtn.addEventListener('click', () => {
    installPrompt.classList.add('hidden');
    localStorage.setItem('pwaPromptDismissed', 'true');
  });

  // Show iOS prompt if applicable
  window.addEventListener('load', () => {
    if (isIos() && !isStandalone() && !localStorage.getItem('pwaPromptDismissed')) {
      setTimeout(() => {
        iosPrompt.classList.remove('hidden');
      }, 3000);
    }
  });
"""

content = content.replace('async function apiFetch(url, method=\'GET\', body=null) {',
                          pwa_scripts + '\n  async function apiFetch(url, method=\'GET\', body=null) {')

with open('api/templates/base.html', 'w') as f:
    f.write(content)

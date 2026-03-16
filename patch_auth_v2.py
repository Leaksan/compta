with open('api/templates/auth.html', 'r') as f:
    content = f.read()

# Add Install UI components if not already there
install_ui = """
<!-- PWA Install Prompt -->
<div id="installPrompt" class="hidden fixed inset-x-4 bottom-8 z-50 animate-bounce">
  <div class="bg-neutral-900 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm mx-auto">
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
<div id="iosInstallPrompt" class="hidden fixed inset-x-4 bottom-8 z-50">
  <div class="bg-white text-neutral-900 p-5 rounded-2xl shadow-2xl border border-neutral-100 max-w-sm mx-auto slide-up">
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
      <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
    </div>
  </div>
</div>
"""

if 'id="installPrompt"' not in content:
    content = content.replace('</body>', install_ui + '\n</body>')

# Add full PWA logic
pwa_logic = """
  // PWA Install Logic
  let deferredPrompt;
  const installPrompt = document.getElementById('installPrompt');
  const installBtn = document.getElementById('installBtn');
  const closeInstallBtn = document.getElementById('closeInstallBtn');
  const iosPrompt = document.getElementById('iosInstallPrompt');

  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  const isStandalone = () => {
    return (window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone);
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone() && !localStorage.getItem('pwaPromptDismissed')) {
      installPrompt.classList.remove('hidden');
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      installPrompt.classList.add('hidden');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
    });
  }

  if (closeInstallBtn) {
    closeInstallBtn.addEventListener('click', () => {
      installPrompt.classList.add('hidden');
      localStorage.setItem('pwaPromptDismissed', 'true');
    });
  }

  window.addEventListener('load', () => {
    if (isIos() && !isStandalone() && !localStorage.getItem('pwaPromptDismissed')) {
      setTimeout(() => {
        if (iosPrompt) iosPrompt.classList.remove('hidden');
      }, 3000);
    }
  });
"""

if 'let deferredPrompt;' not in content:
    content = content.replace('</script>', pwa_logic + '\n</script>')

with open('api/templates/auth.html', 'w') as f:
    f.write(content)

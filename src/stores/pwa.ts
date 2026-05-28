import { defineStore } from 'pinia';

export const usePWAStore = defineStore('pwa', {
  state: () => ({
    deferredPrompt: null as any,
    isInstallable: false,
    isInstalled: false,
  }),
  actions: {
    init() {
      if (typeof window === 'undefined') return;

      // Event triggered when the browser detects that the app is installable as a PWA
      window.addEventListener('beforeinstallprompt', (e: Event) => {
        // Prevent the mini-infobar or automatic prompt from appearing
        e.preventDefault();
        // Stash the event so it can be triggered later.
        this.deferredPrompt = e;
        this.isInstallable = true;
        console.log('[PWA Store] beforeinstallprompt event captured.');
      });

      // Event triggered when the user successfully installs the PWA
      window.addEventListener('appinstalled', () => {
        this.deferredPrompt = null;
        this.isInstallable = false;
        this.isInstalled = true;
        console.log('[PWA Store] App installed successfully!');
      });

      // Detect if the app is already running as an installed standalone PWA
      if (
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true
      ) {
        this.isInstalled = true;
      }
    },
    async install() {
      const promptEvent = this.deferredPrompt;
      if (!promptEvent) {
        console.warn('[PWA Store] Install prompt is not available yet.');
        return false;
      }
      
      // Trigger the browser installation prompt
      promptEvent.prompt();
      
      // Wait for the user's decision
      const { outcome } = await promptEvent.userChoice;
      console.log(`[PWA Store] User choice outcome: ${outcome}`);
      
      // Reset the prompt as it's a one-time use token
      this.deferredPrompt = null;
      this.isInstallable = false;
      
      return outcome === 'accepted';
    }
  }
});

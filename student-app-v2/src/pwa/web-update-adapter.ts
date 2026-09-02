const isTauri = '__TAURI_INTERNALS__' in window;

export function registerWebUpdateAdapter() {
  if (isTauri || !('serviceWorker' in navigator)) return;

  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
    let updatePrompted = false;
    const promptForUpdate = (worker: ServiceWorker | null) => {
      if (!worker || updatePrompted || !navigator.serviceWorker.controller) return;
      updatePrompted = true;
      if (window.confirm('نسخه جدید برنامه آماده است. اکنون به‌روزرسانی شود؟')) {
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    promptForUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') promptForUpdate(worker);
      });
    });

    const checkForUpdate = () => void registration.update();
    window.setTimeout(checkForUpdate, 1000);
    window.addEventListener('online', checkForUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
  }).catch(() => {
    // Service workers are progressive enhancement for the web build.
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  }, { once: true });
}
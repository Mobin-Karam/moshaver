const isTauri = '__TAURI_INTERNALS__' in window;

export function registerWebUpdateAdapter() {
  if (isTauri || !('serviceWorker' in navigator)) return;

  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
    const promptForUpdate = (worker: ServiceWorker | null) => {
      if (!worker || !navigator.serviceWorker.controller) return;
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

    window.setTimeout(() => void registration.update(), 1000);
  }).catch(() => {
    // Service workers are progressive enhancement for the web build.
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  }, { once: true });
}
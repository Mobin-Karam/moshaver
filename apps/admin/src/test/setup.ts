import "@testing-library/jest-dom/vitest";

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = TestResizeObserver as typeof ResizeObserver;
globalThis.requestAnimationFrame = (callback) =>
  window.setTimeout(() => callback(performance.now()), 0);
globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id);

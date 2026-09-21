import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('web update adapter', () => {
  it('does not reload when the service worker takes control for the first time', async () => {
    const addEventListener = vi.fn();
    const registration = {
      waiting: null,
      installing: null,
      update: vi.fn(),
      addEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { controller: null, register: vi.fn().mockResolvedValue(registration), addEventListener },
    });

    const { registerWebUpdateAdapter } = await import('./web-update-adapter');
    registerWebUpdateAdapter();
    await Promise.resolve();

    expect(addEventListener).not.toHaveBeenCalledWith('controllerchange', expect.any(Function), expect.anything());
  });

  it('reloads when an existing service worker is replaced after approval', async () => {
    const addEventListener = vi.fn();
    const registration = {
      waiting: null,
      installing: null,
      update: vi.fn(),
      addEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { controller: {}, register: vi.fn().mockResolvedValue(registration), addEventListener },
    });

    const { registerWebUpdateAdapter } = await import('./web-update-adapter');
    registerWebUpdateAdapter();

    expect(addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function), { once: true });
  });
});

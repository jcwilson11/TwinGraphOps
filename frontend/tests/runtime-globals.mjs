export function installRuntimeWindowConfig(overrides = {}) {
  const requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
  const cancelAnimationFrame = (handle) => clearTimeout(handle);
  const createElement = () => ({
    getContext: () => ({}),
    style: {},
    styleSheet: null,
    setAttribute: () => {},
    appendChild: () => {},
  });
  const head = {
    appendChild: () => {},
  };
  const body = {
    appendChild: () => {},
  };

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      __TWIN_CONFIG__: {
        MAX_UPLOAD_MB: 50,
        PROCESSING_TIMEOUT_MS: 90000,
        APP_ENV: 'test',
        ...overrides,
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      addEventListener: () => {},
      removeEventListener: () => {},
      requestAnimationFrame,
      cancelAnimationFrame,
      devicePixelRatio: 1,
      innerWidth: 1024,
      innerHeight: 768,
    },
  });

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: {
      createElement,
      createTextNode: () => ({}),
      getElementsByTagName: (name) => {
        if (name === 'head') {
          return [head];
        }
        if (name === 'body') {
          return [body];
        }
        return [];
      },
      head,
      body,
      documentElement: createElement(),
    },
  });

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: {
      userAgent: 'node.js',
    },
  });

  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: requestAnimationFrame,
  });

  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    writable: true,
    value: cancelAnimationFrame,
  });

  if (!('ResizeObserver' in globalThis)) {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
  }
}

installRuntimeWindowConfig();

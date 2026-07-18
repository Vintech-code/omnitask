import { ensureAuthEndpointReachable, withAuthTimeout } from '@/services/AuthNetworkService';

describe('Firebase Auth network preflight', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('continues when the Firebase host responds with any HTTP status', async () => {
    global.fetch = jest.fn(async () => new Response(null, { status: 404 })) as typeof fetch;
    await expect(ensureAuthEndpointReachable(100)).resolves.toBeUndefined();
  });

  it('fails quickly with a useful error when the host stalls', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })) as typeof fetch;

    const request = ensureAuthEndpointReachable(100);
    const rejection = expect(request).rejects.toMatchObject({ code: 'auth/network-request-failed' });
    await jest.advanceTimersByTimeAsync(100);
    await rejection;
  });
});

describe('withAuthTimeout', () => {
  it('returns a completed authentication request', async () => {
    await expect(withAuthTimeout(Promise.resolve('signed-in'), 50)).resolves.toBe('signed-in');
  });

  it('rejects a stalled authentication request instead of loading forever', async () => {
    jest.useFakeTimers();
    const request = withAuthTimeout(new Promise<string>(() => undefined), 50);
    jest.advanceTimersByTime(50);
    await expect(request).rejects.toMatchObject({ code: 'auth/timeout' });
    jest.useRealTimers();
  });
});

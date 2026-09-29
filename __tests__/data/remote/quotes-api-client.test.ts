import { AppError } from '@core/errors/app-error';
import {
  QUOTES_API_URL,
  fetchQuoteBatch,
} from '@data/remote/quotes-api-client';

const response = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
  } as Response);

describe('fetchQuoteBatch', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('asks the quotes service and returns whatever JSON it sends, unjudged', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(response([{ q: 'x', a: 'y' }]));

    await expect(fetchQuoteBatch(fetchImpl)).resolves.toEqual([
      { q: 'x', a: 'y' },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      QUOTES_API_URL,
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('uses HTTPS', () => {
    expect(QUOTES_API_URL.startsWith('https://')).toBe(true);
  });

  it('reports an HTTP error status as a typed error', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response(null, false, 503));

    const error = await fetchQuoteBatch(fetchImpl).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'QUOTES_HTTP' });
  });

  it('reports a network failure as a typed error, not a raw one', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed'));

    await expect(fetchQuoteBatch(fetchImpl)).rejects.toMatchObject({
      code: 'QUOTES_UNAVAILABLE',
    });
  });

  it('reports an unreadable response body as a typed error', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    await expect(fetchQuoteBatch(fetchImpl)).rejects.toMatchObject({
      code: 'QUOTES_UNAVAILABLE',
    });
  });

  it('gives up when the service is too slow', async () => {
    jest.useFakeTimers();
    const fetchImpl = jest.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );

    const result = fetchQuoteBatch(fetchImpl as never, 5000).catch(
      (e: unknown) => e,
    );
    jest.advanceTimersByTime(5001);

    await expect(result).resolves.toMatchObject({ code: 'QUOTES_UNAVAILABLE' });
  });
});

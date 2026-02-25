export type FetchOptions = {
  timeoutMs?: number;
  retry?: number;
  retryDelayMs?: number;
};

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = 8000, retry = 1, retryDelayMs = 300 } = options;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retry) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt > retry) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Fetch failed');
}

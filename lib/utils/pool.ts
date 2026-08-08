/**
 * Bounded-concurrency async map — a small worker-pool primitive.
 *
 * Runs `fn` over every item with at most `concurrency` promises in flight at
 * once, and resolves to results in the SAME order as the input. N workers pull
 * from a shared cursor, so the slowest item never blocks the others and total
 * in-flight work is capped exactly once. This is how we saturate all available
 * API keys without a fixed per-call sleep: latency becomes the slowest wave,
 * not the sum of every call.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  if (!items.length) return results;
  const workers = Math.max(1, Math.min(Math.floor(concurrency) || 1, items.length));
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}

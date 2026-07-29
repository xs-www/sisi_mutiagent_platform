// 内存中的并发计数器
const concurrencyMap = new Map<string, number>(); // apiKeyId -> current count

export function acquireKey(apiKeyId: string, maxConcurrency: number): boolean {
  const current = concurrencyMap.get(apiKeyId) || 0;
  if (current >= maxConcurrency) {
    return false; // 达到并发上限
  }
  concurrencyMap.set(apiKeyId, current + 1);
  return true;
}

export function releaseKey(apiKeyId: string): void {
  const current = concurrencyMap.get(apiKeyId) || 0;
  if (current <= 1) {
    concurrencyMap.delete(apiKeyId);
  } else {
    concurrencyMap.set(apiKeyId, current - 1);
  }
}

export function getCurrentConcurrency(apiKeyId: string): number {
  return concurrencyMap.get(apiKeyId) || 0;
}

// 获取一个可用的API Key（按并发选择最空闲的）
export function selectAvailableKey(keys: Array<{ id: string; maxConcurrency: number }>): string | null {
  // 找到当前并发最低且未满的key
  let bestId: string | null = null;
  let bestRatio = Infinity;
  for (const key of keys) {
    const current = getCurrentConcurrency(key.id);
    if (current < key.maxConcurrency) {
      const ratio = current / key.maxConcurrency;
      if (ratio < bestRatio) {
        bestRatio = ratio;
        bestId = key.id;
      }
    }
  }
  return bestId;
}

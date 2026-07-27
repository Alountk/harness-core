export async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let currentIndex =  0;

    async function worker() {
        while (currentIndex < items.length) {
            const index = currentIndex++;
            const item = items[index];
            if (item === undefined) continue; // Skip undefined items
            results[index] = await fn(item, index);
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
    await Promise.all(workers);

    return results;
}
export class QueueManager {
  private queue: Map<string, Promise<any>> = new Map()

  async enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.queue.has(key)) {
      return this.queue.get(key)
    }

    const promise = operation().finally(() => {
      this.queue.delete(key)
    })

    this.queue.set(key, promise)
    return promise
  }

  isQueued(key: string): boolean {
    return this.queue.has(key)
  }

  clear(): void {
    this.queue.clear()
  }
}

export class RateLimiter {
  private queue: Array<() => Promise<any>> = []
  private processing: boolean = false
  private requestsPerSecond: number

  constructor(requestsPerSecond: number = 10) {
    this.requestsPerSecond = requestsPerSecond
  }

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true
    const request = this.queue.shift()
    if (request) {
      await request()
      setTimeout(() => this.processQueue(), 1000 / this.requestsPerSecond)
    }
  }
}

import { RetryConfig } from './types'

export class RetryHandler {
  async handle<T>(request: () => Promise<T>, config: RetryConfig): Promise<T> {
    const { retry, retryDelay = 1000, shouldRetry } = config
    let lastError: any

    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        return await request()
      } catch (error) {
        lastError = error

        if (attempt === retry || (shouldRetry && !shouldRetry(error))) {
          throw error
        }

        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * Math.pow(2, attempt)),
        )
      }
    }

    throw lastError
  }
}

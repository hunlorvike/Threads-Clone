import { ApiError } from './types'

export class ErrorHandler {
  private handlers: Map<number, (error: Error) => void> = new Map()

  addHandler(status: number, handler: (error: Error) => void) {
    this.handlers.set(status, handler)
  }

  handle(error: Error) {
    const status = (error as any).response?.status
    const handler = this.handlers.get(status)

    if (handler) {
      handler(error)
    }

    return Promise.reject(this.normalizeError(error))
  }

  private normalizeError(error: Error): ApiError {
    return Object.assign(new Error(error.message), {
      status: (error as any).response?.status,
      code: (error as any).response?.data?.code,
      data: (error as any).response?.data,
    })
  }
}

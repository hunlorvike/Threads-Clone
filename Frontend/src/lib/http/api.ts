import { AuthManager } from './auth-manager'
import { ErrorHandler } from './error-handler'
import { HttpClient } from './http-client'
import { RateLimiter } from './rate-limiter'
import { RetryHandler } from './retry'
import { HttpConfig } from './types'

const createApi = (
  baseURL: string,
  config?: HttpConfig,
  dependencies?: {
    rateLimiter?: RateLimiter
    retryHandler?: RetryHandler
    errorHandler?: ErrorHandler
    authManager?: AuthManager
  },
) => {
  const client = new HttpClient(baseURL, config, dependencies)

  const errorHandler = dependencies?.errorHandler || new ErrorHandler()
  errorHandler.addHandler(400, (error: any) => {
    console.error('Bad Request:', error.response?.data)
  })

  client.addRequestInterceptor({
    onRequest: (config) => {
      console.debug(`🚀 [API] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      })
      return config
    },
  })

  client.addResponseInterceptor({
    onResponse: (response) => {
      console.debug(
        `✅ [API] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
          data: response.data,
        },
      )
      return response
    },
    onResponseError: (error) => {
      console.error(
        `❌ [API] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        {
          status: error.response?.status,
          data: error.response?.data,
        },
      )
      return Promise.reject(error)
    },
  })

  return client
}

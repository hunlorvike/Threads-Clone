import axios, { AxiosInstance } from 'axios'
import { ErrorHandler } from './error-handler'
import { RateLimiter } from './rate-limiter'
import { RetryHandler } from './retry'
import {
  RequestInterceptor,
  ResponseInterceptor,
  HttpConfig,
  HttpResponse,
} from './types'
import { AuthManager } from './auth-manager'

export class HttpClient {
  private instance: AxiosInstance
  private rateLimiter: RateLimiter
  private retryHandler: RetryHandler
  private errorHandler: ErrorHandler
  private authManager: AuthManager
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private abortControllers: Map<string, AbortController> = new Map()

  constructor(
    baseURL: string,
    config: HttpConfig = {},
    dependencies?: {
      rateLimiter?: RateLimiter
      retryHandler?: RetryHandler
      errorHandler?: ErrorHandler
      authManager?: AuthManager
    },
  ) {
    this.instance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': config.contentType || 'application/json',
        ...config.headers,
      },
      ...config,
    })

    this.rateLimiter = dependencies?.rateLimiter || new RateLimiter()
    this.retryHandler = dependencies?.retryHandler || new RetryHandler()
    this.errorHandler = dependencies?.errorHandler || new ErrorHandler()
    this.authManager = dependencies?.authManager || new AuthManager()

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    this.instance.interceptors.request.use(
      async (config) => {
        let currentConfig = config

        for (const interceptor of this.requestInterceptors) {
          if (interceptor.onRequest) {
            currentConfig = await interceptor.onRequest(currentConfig)
          }
        }

        if ((currentConfig as HttpConfig).withCredentials) {
          let token = this.authManager.getToken()

          if (!token) {
            token = await this.authManager.refreshToken()
          }

          if (token) {
            currentConfig.headers.Authorization = `Bearer ${token}`
          }
        }

        if ((currentConfig as HttpConfig).contentType) {
          currentConfig.headers['Content-Type'] = (
            currentConfig as HttpConfig
          ).contentType
        }

        const controller = new AbortController()
        this.abortControllers.set(currentConfig.url!, controller)
        currentConfig.signal = controller.signal

        return currentConfig
      },
      async (error) => {
        for (const interceptor of this.requestInterceptors) {
          if (interceptor.onRequestError) {
            await interceptor.onRequestError(error)
          }
        }
        return Promise.reject(error)
      },
    )

    this.instance.interceptors.response.use(
      async (response) => {
        let currentResponse = response

        this.abortControllers.delete(response.config.url!)

        const config = response.config as HttpConfig
        if (config.progressCallback) {
          config.progressCallback(100)
        }

        for (const interceptor of this.responseInterceptors) {
          if (interceptor.onResponse) {
            currentResponse = await interceptor.onResponse(currentResponse)
          }
        }

        return currentResponse
      },
      async (error) => {
        if (error.config) {
          this.abortControllers.delete(error.config.url!)
        }

        for (const interceptor of this.responseInterceptors) {
          if (interceptor.onResponseError) {
            await interceptor.onResponseError(error)
          }
        }

        return this.errorHandler.handle(error)
      },
    )
  }

  public addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  public addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }

  public cancelRequest(url: string): void {
    const controller = this.abortControllers.get(url)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(url)
    }
  }

  public cancelAllRequests(): void {
    this.abortControllers.forEach((controller) => controller.abort())
    this.abortControllers.clear()
  }

  private async executeRequest<T>(
    request: () => Promise<HttpResponse<T>>,
    config: HttpConfig,
  ): Promise<HttpResponse<T>> {
    const response = await this.rateLimiter.add(async () => {
      if (config.retryConfig) {
        return this.retryHandler.handle(request, config.retryConfig)
      }
      return request()
    })

    return response
  }

  public async get<T = any>(
    url: string,
    config: HttpConfig = {},
  ): Promise<HttpResponse<T>> {
    return this.executeRequest<T>(() => this.instance.get<T>(url, config), {
      ...config,
      url,
    })
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config: HttpConfig = {},
  ): Promise<HttpResponse<T>> {
    return this.executeRequest<T>(
      () => this.instance.post<T>(url, data, config),
      { ...config, url, data },
    )
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config: HttpConfig = {},
  ): Promise<HttpResponse<T>> {
    return this.executeRequest<T>(
      () => this.instance.put<T>(url, data, config),
      { ...config, url, data },
    )
  }

  public async delete<T = any>(
    url: string,
    config: HttpConfig = {},
  ): Promise<HttpResponse<T>> {
    return this.executeRequest<T>(() => this.instance.delete<T>(url, config), {
      ...config,
      url,
    })
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config: HttpConfig = {},
  ): Promise<HttpResponse<T>> {
    return this.executeRequest<T>(
      () => this.instance.patch<T>(url, data, config),
      { ...config, url, data },
    )
  }
}

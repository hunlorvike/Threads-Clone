import {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'

export interface HttpConfig extends AxiosRequestConfig {
  retryConfig?: RetryConfig
  progressCallback?: (progress: number) => void
  contentType?: string
}

export interface RetryConfig {
  retry: number
  retryDelay?: number
  shouldRetry?: (error: any) => boolean
}

export interface RequestInterceptor {
  onRequest?: (
    config: InternalAxiosRequestConfig,
  ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>
  onRequestError?: (error: any) => Promise<any>
}

export interface ResponseInterceptor {
  onResponse?: (
    response: AxiosResponse,
  ) => AxiosResponse | Promise<AxiosResponse>
  onResponseError?: (error: any) => Promise<any>
}

export interface HttpResponse<T = any> extends AxiosResponse<T> {}

export interface ApiError extends Error {
  status?: number
  code?: string
  data?: any
}

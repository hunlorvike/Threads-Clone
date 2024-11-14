import { useState, useEffect, useCallback } from 'react'
import { HttpConfig, HttpResponse } from 'threads/lib/http/types'

interface UseApiOptions<T, E = Error> {
  immediate?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: E) => void
  transform?: (data: T) => T
  config?: HttpConfig
}

interface UseApiState<T, E = Error> {
  data: T | null
  error: E | null
  loading: boolean
}

export function useApi<T, E = Error>(
  requestFn: (config?: HttpConfig) => Promise<HttpResponse<T>>,
  options: UseApiOptions<T, E> = {},
) {
  const [state, setState] = useState<UseApiState<T, E>>({
    data: null,
    error: null,
    loading: options.immediate !== false,
  })

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const response = await requestFn(options.config)
      const data = options.transform
        ? options.transform(response.data)
        : response.data

      setState((prev) => ({ ...prev, data, loading: false }))
      options.onSuccess?.(data)

      return data
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as E, loading: false }))
      options.onError?.(error as E)
      throw error
    }
  }, [options, requestFn])

  useEffect(() => {
    if (options.immediate !== false) {
      execute()
    }
  }, [execute, options.immediate])

  return {
    ...state,
    execute,
  }
}

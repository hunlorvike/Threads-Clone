export class AuthManager {
  private storage: Storage
  private tokenKey: string
  private refreshTokenKey: string
  private refreshTokenEndpoint: string

  constructor(
    storage: Storage = localStorage,
    tokenKey: string = 'auth_token',
    refreshTokenKey: string = 'refresh_token',
    refreshTokenEndpoint: string = '/auth/refresh',
  ) {
    this.storage = storage
    this.tokenKey = tokenKey
    this.refreshTokenKey = refreshTokenKey
    this.refreshTokenEndpoint = refreshTokenEndpoint
  }

  getToken(): string | null {
    return this.storage.getItem(this.tokenKey)
  }

  setToken(token: string): void {
    this.storage.setItem(this.tokenKey, token)
  }

  getRefreshToken(): string | null {
    return this.storage.getItem(this.refreshTokenKey)
  }

  setRefreshToken(token: string): void {
    this.storage.setItem(this.refreshTokenKey, token)
  }

  clearTokens(): void {
    this.storage.removeItem(this.tokenKey)
    this.storage.removeItem(this.refreshTokenKey)
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return null

    try {
      const response = await fetch(this.refreshTokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) throw new Error('Failed to refresh token')

      const data = await response.json()
      this.setToken(data.access_token)
      if (data.refresh_token) {
        this.setRefreshToken(data.refresh_token)
      }

      return data.access_token
    } catch (_error) {
      this.clearTokens()
      return null
    }
  }
}

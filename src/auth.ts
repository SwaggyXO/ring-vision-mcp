export type AuthMode = 'access_token' | 'refresh_token';

export interface AuthConfig {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  tokenEndpoint?: string;
}

export class RingAuthManager {
  private config: AuthConfig;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(config?: AuthConfig) {
    this.config = config || {
      accessToken: process.env.RING_ACCESS_TOKEN,
      refreshToken: process.env.RING_REFRESH_TOKEN,
      clientId: process.env.RING_CLIENT_ID,
      clientSecret: process.env.RING_CLIENT_SECRET,
      tokenEndpoint: process.env.RING_TOKEN_ENDPOINT || 'https://oauth.ring.com/oauth/token',
    };
  }

  getAuthMode(): AuthMode | null {
    if (this.config.accessToken && this.config.refreshToken) {
      return null;
    }
    if (this.config.accessToken) return 'access_token';
    if (this.config.refreshToken) return 'refresh_token';
    return null;
  }

  async getAccessToken(): Promise<string> {
    if (this.config.accessToken && this.config.refreshToken) {
      throw new Error(
        'Both RING_ACCESS_TOKEN and RING_REFRESH_TOKEN are set. Please provide only one authentication method.'
      );
    }

    if (this.config.accessToken) {
      return this.config.accessToken;
    }

    if (this.config.refreshToken) {
      if (!this.config.clientId || !this.config.clientSecret) {
        throw new Error(
          'RING_CLIENT_ID and RING_CLIENT_SECRET are required when using RING_REFRESH_TOKEN.'
        );
      }

      if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
        return this.cachedToken.token;
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      });

      const endpoint = this.config.tokenEndpoint || 'https://oauth.ring.com/oauth/token';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as { access_token: string; expires_in: number };
      const safetyWindowMs = 60000;
      this.cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000 - safetyWindowMs,
      };

      return data.access_token;
    }

    throw new Error(
      'Authentication not configured. Set RING_ACCESS_TOKEN or RING_REFRESH_TOKEN in your environment.'
    );
  }

  handleApiError(status: number, responseBody: string): Error {
    if (status === 401) {
      if (this.config.accessToken) {
        return new Error(
          'HTTP 401 Unauthorized: The Ring access token has expired or is invalid. ' +
          'Generate a fresh token in the Ring Developer Playground (https://developer.amazon.com/ring/console/playground) ' +
          'and update your RING_ACCESS_TOKEN environment variable.'
        );
      }
      return new Error(`HTTP 401 Unauthorized: Authentication failed. Details: ${responseBody}`);
    }
    return new Error(`Ring Partner API error (${status}): ${responseBody}`);
  }
}

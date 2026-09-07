// KIS OAuth Authentication & Token Management Service

export interface KISAuthToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
}

export class KISAuthService {
  private static instance: KISAuthService;
  private currentToken: KISAuthToken | null = null;

  public static getInstance(): KISAuthService {
    if (!KISAuthService.instance) {
      KISAuthService.instance = new KISAuthService();
    }
    return KISAuthService.instance;
  }

  public async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.currentToken && this.currentToken.expiresAt > now + 60000) {
      return this.currentToken.accessToken;
    }

    const appKey = process.env.KIS_APPKEY;
    const appSecret = process.env.KIS_APPSECRET;

    if (!appKey || !appSecret) {
      throw new Error("KIS_AUTH_ERROR: Missing KIS_APPKEY or KIS_APPSECRET environment variables");
    }

    try {
      const res = await fetch("https://openapi.koreainvestment.com:9443/oauth2/tokenP", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          appkey: appKey,
          appsecret: appSecret
        })
      });

      if (!res.ok) {
        throw new Error(`KIS_TOKEN_REQUEST_FAILED:${res.status}`);
      }

      const data = await res.json();
      if (!data.access_token) {
        throw new Error("KIS_TOKEN_RESPONSE_INVALID");
      }

      const expiresInMs = (data.expires_in || 86400) * 1000;
      this.currentToken = {
        accessToken: data.access_token,
        tokenType: data.token_type || "Bearer",
        expiresAt: now + expiresInMs
      };

      return this.currentToken.accessToken;
    } catch (err: any) {
      throw new Error(`KIS_AUTH_FAILED: ${err.message}`);
    }
  }
}

export const kisAuthService = KISAuthService.getInstance();

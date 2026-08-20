import { config } from "../../config.js";

export interface MlTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token?: string;
}

const TOKEN_URL = "https://api.mercadolibre.com/oauth/token";

export function buildAuthorizationUrl(): string {
  const url = new URL("https://auth.mercadolivre.com.br/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.mercadoLivreApi.clientId);
  url.searchParams.set("redirect_uri", config.mercadoLivreApi.redirectUri);
  return url.toString();
}

export function exchangeCodeForTokens(code: string): Promise<MlTokenResponse> {
  return requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.mercadoLivreApi.redirectUri,
  });
}

export function refreshTokens(refreshToken: string): Promise<MlTokenResponse> {
  return requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

async function requestToken(params: Record<string, string>): Promise<MlTokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: config.mercadoLivreApi.clientId,
      client_secret: config.mercadoLivreApi.clientSecret,
      ...params,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Falha ao obter token do Mercado Livre (${response.status}): ${body}`);
  }

  return response.json() as Promise<MlTokenResponse>;
}

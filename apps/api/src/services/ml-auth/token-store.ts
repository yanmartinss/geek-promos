import path from "node:path";

import { refreshTokens, type MlTokenResponse } from "./oauth.js";
import { upsertEnvFile } from "./env-file.js";

const ENV_PATH = path.resolve(process.cwd(), ".env");

let accessToken = process.env.ML_ACCESS_TOKEN ?? "";
let refreshToken = process.env.ML_REFRESH_TOKEN ?? "";

export function getAccessToken(): string {
  if (!accessToken) {
    throw new Error("ML_ACCESS_TOKEN ausente. Rode `pnpm ml:oauth` para autenticar.");
  }
  return accessToken;
}

export function persistTokens(tokens: Pick<MlTokenResponse, "access_token" | "refresh_token">): void {
  accessToken = tokens.access_token;
  if (tokens.refresh_token) refreshToken = tokens.refresh_token;

  process.env.ML_ACCESS_TOKEN = accessToken;
  process.env.ML_REFRESH_TOKEN = refreshToken;

  upsertEnvFile(ENV_PATH, {
    ML_ACCESS_TOKEN: accessToken,
    ML_REFRESH_TOKEN: refreshToken,
  });
}

export async function refreshAccessToken(): Promise<string> {
  if (!refreshToken) {
    throw new Error("ML_REFRESH_TOKEN ausente. Rode `pnpm ml:oauth` para autenticar.");
  }

  const tokens = await refreshTokens(refreshToken);
  persistTokens(tokens);
  return accessToken;
}

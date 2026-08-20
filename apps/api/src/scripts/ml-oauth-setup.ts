import { createInterface } from "node:readline/promises";
import { exec } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildAuthorizationUrl, exchangeCodeForTokens } from "../services/ml-auth/oauth.js";
import { persistTokens } from "../services/ml-auth/token-store.js";

function openInBrowser(url: string): void {
  const command =
    process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;

  exec(command, (error) => {
    if (error) console.warn("⚠️  Não foi possível abrir o navegador automaticamente. Acesse o link manualmente.");
  });
}

async function main() {
  const authUrl = buildAuthorizationUrl();

  console.log("🔐 Autenticação Mercado Livre");
  console.log("Abrindo o navegador para login...\n");
  console.log(authUrl, "\n");
  openInBrowser(authUrl);

  console.log("Após fazer login, o Mercado Livre vai redirecionar para a redirect_uri configurada");
  console.log('com um parâmetro "code" na URL (ex: ...?code=TG-XXXXX...).');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const code = (await rl.question("\nCole aqui o valor do parâmetro code: ")).trim();
  rl.close();

  if (!code) {
    console.error("❌ Nenhum code informado.");
    process.exit(1);
  }

  const tokens = await exchangeCodeForTokens(code);
  console.log(`\nToken recebido do Mercado Livre (expira em ${tokens.expires_in}s). Gravando no .env...`);

  persistTokens(tokens);

  const envPath = path.resolve(process.cwd(), ".env");
  const writtenBack = readFileSync(envPath, "utf8");
  const savedAccessToken = /^ML_ACCESS_TOKEN=(.+)$/m.exec(writtenBack)?.[1]?.trim();

  if (savedAccessToken && savedAccessToken === tokens.access_token) {
    console.log(`✅ Confirmado: ${envPath} contém o novo ML_ACCESS_TOKEN (${savedAccessToken.slice(0, 8)}...).`);
  } else {
    console.error(`❌ A gravação não foi confirmada em ${envPath}. Verifique se outro processo (editor com autosave, sync de nuvem) está sobrescrevendo o arquivo.`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("❌ Falha na autenticação:", err);
  process.exit(1);
});

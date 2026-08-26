import "./load-env.js";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),
  EVOLUTION_API_URL: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),
  EVOLUTION_WHATSAPP_ID: z.string().optional(),
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  TWITTER_ACCESS_TOKEN: z.string().optional(),
  TWITTER_ACCESS_SECRET: z.string().optional(),
  TELEGRAM_GROUP_URL: z.string().optional(),
  TWITTER_MIN_DISCOUNT_PERCENT: z.coerce.number().nonnegative().default(40),
  TWITTER_HIGH_INTEREST_KEYWORDS: z
    .string()
    .default("box|luxo|edição especial|capa dura premium|colecionador"),
  TWITTER_DAILY_LIMIT: z.coerce.number().int().positive().default(15),
  TWITTER_MIN_INTERVAL_MINUTES: z.coerce.number().int().positive().default(30),
  OFFER_DEDUP_DAYS: z.coerce.number().int().positive().default(7),
  MIN_DISCOUNT_PERCENT: z.coerce.number().nonnegative().default(20),
  SEARCH_KEYWORDS: z
    .string()
    .default(
      "livro box colecionador,livros mais vendidos,livro ficção cientifica,livro fantasia,livro romance romantasy,livro darkside books,livro pipoca e nanquim,box senhor dos aneis,box harry potter,box percy jackson,graphic novel,kindle paperwhite,capa kindle,luminaria para leitura,marcador de pagina,board game jogos de tabuleiro,livro capa dura luxo,livro stephen king,livro george rr martin",
    ),
  TITLE_KEYWORD_FILTER: z
    .string()
    .default(
      "livro|graphic novel|colecionável|colecionavel|jogo de tabuleiro|board game",
    ),
  SCRAPER_MAX_ITEMS_PER_KEYWORD: z.coerce.number().int().positive().default(20),
  SCRAPER_PAGE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  SCRAPER_NAV_DELAY_MS: z.coerce.number().int().positive().default(2000),
  SCRAPER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  SCRAPER_BATCH_SIZE: z.coerce.number().int().positive().default(4),
  SCRAPER_BATCH_DELAY_MS: z.coerce.number().int().positive().default(180000),
  SCRAPER_BLOCK_COOLDOWN_MS: z.coerce.number().int().positive().default(300000),
  SCRAPER_PROXY_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  ML_CLIENT_ID: z.string().min(1),
  ML_CLIENT_SECRET: z.string().min(1),
  ML_REDIRECT_URI: z.string().url(),
  ML_SITE_ID: z.string().default("MLB"),
  ML_ACCESS_TOKEN: z.string().optional(),
  ML_REFRESH_TOKEN: z.string().optional(),
  MATT_TOOL: z.string().min(1),
  MATT_WORD: z.string().min(1),
  AMAZON_ASSOCIATE_TAG: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Configuração de ambiente inválida:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

const env = parsed.data;

const evolution = resolveEvolutionConfig();
const amazon = resolveAmazonConfig();
const twitter = resolveTwitterConfig();

export const config = {
  port: env.PORT,
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    chatId: env.TELEGRAM_CHAT_ID,
  },
  evolution,
  twitter,
  offer: {
    dedupDays: env.OFFER_DEDUP_DAYS,
    minDiscountPercent: env.MIN_DISCOUNT_PERCENT,
  },
  scraper: {
    keywords: env.SEARCH_KEYWORDS.split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    titleKeywordFilter: new RegExp(env.TITLE_KEYWORD_FILTER, "i"),
    maxItemsPerKeyword: env.SCRAPER_MAX_ITEMS_PER_KEYWORD,
    pageTimeoutMs: env.SCRAPER_PAGE_TIMEOUT_MS,
    navDelayMs: env.SCRAPER_NAV_DELAY_MS,
    concurrency: env.SCRAPER_CONCURRENCY,
    batchSize: env.SCRAPER_BATCH_SIZE,
    batchDelayMs: env.SCRAPER_BATCH_DELAY_MS,
    blockCooldownMs: env.SCRAPER_BLOCK_COOLDOWN_MS,
    proxyUrl: env.SCRAPER_PROXY_URL ?? null,
  },
  mercadoLivreApi: {
    clientId: env.ML_CLIENT_ID,
    clientSecret: env.ML_CLIENT_SECRET,
    redirectUri: env.ML_REDIRECT_URI,
    siteId: env.ML_SITE_ID,
    mattTool: env.MATT_TOOL,
    mattWord: env.MATT_WORD,
  },
  amazon,
};

function resolveEvolutionConfig() {
  const url = env.EVOLUTION_API_URL;
  const apiKey = env.EVOLUTION_API_KEY;
  const instance = env.EVOLUTION_INSTANCE;
  const whatsappId = env.EVOLUTION_WHATSAPP_ID;

  if (!url || !apiKey || !instance || !whatsappId) {
    console.warn(
      "⚠️  Evolution API não configurada — envio WhatsApp desabilitado",
    );
    return null;
  }

  return { url, apiKey, instance, whatsappId };
}

function resolveTwitterConfig() {
  const appKey = env.TWITTER_API_KEY;
  const appSecret = env.TWITTER_API_SECRET;
  const accessToken = env.TWITTER_ACCESS_TOKEN;
  const accessSecret = env.TWITTER_ACCESS_SECRET;
  const telegramGroupUrl = env.TELEGRAM_GROUP_URL;

  if (!appKey || !appSecret || !accessToken || !accessSecret || !telegramGroupUrl) {
    console.warn(
      "⚠️  X (Twitter) não configurado — postagem no X desabilitada",
    );
    return null;
  }

  return {
    appKey,
    appSecret,
    accessToken,
    accessSecret,
    telegramGroupUrl,
    minDiscountPercent: env.TWITTER_MIN_DISCOUNT_PERCENT,
    highInterestFilter: new RegExp(env.TWITTER_HIGH_INTEREST_KEYWORDS, "i"),
    dailyLimit: env.TWITTER_DAILY_LIMIT,
    minIntervalMinutes: env.TWITTER_MIN_INTERVAL_MINUTES,
  };
}

function resolveAmazonConfig() {
  const associateTag = env.AMAZON_ASSOCIATE_TAG;

  if (!associateTag) {
    console.warn(
      "⚠️  Amazon Associates não configurado — scraping da Amazon desabilitado",
    );
    return null;
  }

  return { associateTag };
}

# Moto Promos

Sistema para monitorar promoções de peças de moto em marketplaces como Mercado Livre, Amazon e Shopee.

## Tecnologias

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma
- React
- Playwright
- Telegram Bot API

## Estrutura

```
apps/
└── api
```

## Desenvolvimento local

Após `pnpm install`, rode `npx playwright install chromium` uma vez em `apps/api` (o scraper de Mercado Livre usa Playwright, e os binários do navegador não são baixados automaticamente fora do Docker).

## Roadmap

- [x] API Express
- [x] Banco de dados
- [x] Bot do Telegram
- [ ] Crawler Mercado Livre
- [ ] Histórico de preços
- [ ] Dashboard React
- [ ] Amazon
- [ ] Shopee

# Geek Promos

Sistema para monitorar promoções de livros e cultura pop (livros, colecionáveis, jogos de tabuleiro/cartas) em marketplaces como Mercado Livre, Amazon e Shopee.

## Tecnologias

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma
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
- [x] Crawler Mercado Livre
- [ ] Histórico de preços
- [ ] Dashboard React
- [x] Amazon
- [ ] Shopee

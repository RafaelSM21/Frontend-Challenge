# Kurio — NFT Marketplace

Marketplace de demonstração em React e TypeScript com TanStack Router/Query, Axios, MSW, Socket.IO e Playwright. Não usa blockchain, extensões de carteira nem gateway real.

## Início rápido

```bash
npm install
npx playwright install chromium
npm run dev
```

Contas de demonstração (fictícias): `rafael@example.com` e `marina@example.com`, ambas com a senha `Kurio123!`.

Documentação complementar: [ARCHITECTURE.md](./ARCHITECTURE.md) (contratos REST e eventos, sessão, carrinho, cache, reconciliação REST/Socket.IO, limitações e desvios) e [docs/AUDITORIA.md](./docs/AUDITORIA.md) (Lighthouse).

## Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` em `.env.mock` | Liga o MSW (REST + Socket.IO simulados). **Obrigatória no build de demonstração.** |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial dos mocks (também via `?mockScenario=`). |
| `VITE_API_BASE_URL` | `/api` | Base da API REST. |
| `VITE_SOCKET_URL` | `ws://localhost:5173` | URL do Socket.IO; com mocks ligados, o cliente usa a origem da página. |

`npm run dev` e `npm run build` usam `--mode mock`, que lê `.env.mock` (versionado, sem segredos). Na Vercel o build executa `npm run build`, portanto os mocks ficam ativos com esse arquivo; defina `VITE_ENABLE_MOCKS=true` nas variáveis do projeto se preferir não depender dele.

## Direção de conteúdo e navegação

Mercado e Criadores já estão disponíveis nas rotas `/mercado` e `/criadores`:

- **Início:** manter a vitrine atual, centrada nos NFTs, e incluir uma chamada genérica para criadores em destaque. Selecionar um criador leva à página Criadores.
- **Mercado:** descobrir coleções agrupadas a partir dos NFTs existentes, com busca por nome/criador, filtros por categoria/rede/criador e ordenação por novidades, quantidade ou nome. O estado fica na URL. Os cards usam imagens e autoria dos NFTs da coleção; selecionar uma coleção abre a página dedicada `/colecoes/:collectionName`, com seus NFTs, informações, ordenação e paginação. A partir dali, detalhes e compra reutilizam os fluxos existentes. Não são exibidas métricas que não estejam nos dados.
- **Criadores:** diretório com busca e filtros por categoria, rede e coleção, além de ordenação por novidades, número de obras ou nome. O estado fica na URL. Cada perfil em `/criadores/:creatorName` reúne os NFTs existentes daquele criador, com ordenação, paginação e links para coleções e detalhes. A foto de perfil vem da conta cujo nome de usuário corresponde ao identificador do criador; sem correspondência ou foto cadastrada, é exibida a inicial do nome. Os dados são agregados das obras já disponíveis; não são inventadas biografias ou métricas.
- **Aprenda:** conectar à seção Diário da Cunhagem do Início, evitando criar conteúdo editorial separado enquanto isso estiver fora do escopo.

**Filtros.** Início, Mercado e Criadores usam o mesmo painel (`src/components/catalog-filters.tsx`: `FilterPanel` e `FilterToolbar`), com a mesma aparência, o mesmo drawer no mobile e o mesmo comportamento de teclado. Cada tela declara apenas seus grupos (veja a tabela em ARCHITECTURE.md §8); a faixa de preço existe só no Início.

## Comandos

```bash
npm run dev          # Vite com mocks
npm run build        # tipos + build de demonstração
npm run preview      # preview na porta 4173
npm run typecheck
npm run lint
npm run test:e2e
npm run test:visual           # só a regressão visual
npm run test:visual:update    # regenera as baselines
npm run audit:lighthouse
```

## Mocks e cenários

Os mocks MSW são ativados por `VITE_ENABLE_MOCKS=true`. O banco é persistido em `localStorage`; para voltar às fixtures, execute `POST /api/__mock/reset`.

Defina `VITE_MOCK_SCENARIO` ou acrescente `?mockScenario=` à URL. Cenários disponíveis: `default`, `empty-catalog`, `server-error`, `connection-failure`, `slow-network`, `variable-latency`, `out-of-order`, `session-expired`, `favorite-failure`, `price-change`, `availability-change`, `stock-conflict`, `payment-declined`, `order-pending` e `timeout-after-order`. Para reproduzir uma falha, abra a aplicação com `?mockScenario=<nome>` (por exemplo `/?mockScenario=server-error`) e use `POST /api/__mock/reset` para voltar ao cenário conhecido. O cenário `slow-network` atrasa 1,2 s o catálogo, o carrinho (`GET /api/cart`) e a cotação (`POST /api/checkout/quote`), o que exibe os skeletons dessas telas.

A alteração determinística de NFT é disparada por `POST /api/__mock/nfts/:nftId/update`, com `priceEth` e/ou `available`.
Pedidos criados no cenário `order-pending` podem ser atualizados pela API mock com `POST /api/__mock/orders/:orderId/update`, enviando `{"status":"confirmed"}` ou `{"status":"declined"}`.

## Sessão, carrinho e tempo real

- Sessões, favoritos, perfil, carteiras, carrinho e pedidos são isolados por usuário.
- Ao expirar uma sessão, a rota atual é preservada e retomada após novo login.
- O carrinho de visitante é mesclado à conta ao autenticar.
- Preço e disponibilidade trafegam como strings decimais; a cotação do servidor é a referência para o pedido.
- A tentativa de checkout persiste a chave idempotente, a carteira e a cotação; se o pedido for criado mas a resposta sofrer timeout, repetir ou recarregar recupera o mesmo pedido sem duplicar a compra.
- O cliente usa `socket.io-client`. No modo mock, o MSW intercepta WebSocket na origem atual da aplicação; não há servidor Socket.IO externo.
- Eventos `nft.updated` têm `eventId`, `resourceId` e `version`. Eventos `order.updated` também carregam o usuário proprietário e a versão do pedido. Eventos duplicados ou antigos são descartados; catálogo, carrinho, cotação e pedidos ativos são reconciliados após eventos ou reconexão.

## Testes e auditoria

Os E2E usam um worker porque cada teste restaura o mesmo banco persistido. Eles executam em Chromium desktop e mobile, guardando trace em caso de falha.

**Regressão visual.** `e2e/visual.spec.ts` captura Início, Detalhe, Carrinho e Pagamento em desktop (1440) e mobile (390), com banco restaurado, `Date` congelado, animações desativadas e movimento reduzido. As baselines ficam em `e2e/__screenshots__/` (e devem ser versionadas). Renderização de fontes e antialiasing mudam entre sistemas operacionais, então gere e compare no mesmo ambiente: rode `npm run test:visual:update` uma vez, confira as imagens e faça o commit; depois `npm run test:visual` compara com tolerância de 1% dos pixels.

A auditoria Lighthouse mede início e detalhe três vezes por perfil e grava relatórios em `reports/lighthouse`. Veja `docs/AUDITORIA.md`.

## Deploy

`vercel.json` preserva refresh e acesso direto às rotas SPA. Publique o mesmo commit com `npm run build`; confirme que `mockServiceWorker.js` está incluído no deploy.
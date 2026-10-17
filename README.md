# Kurio — NFT Marketplace

Marketplace de demonstração em React e TypeScript com TanStack Router/Query, Axios, MSW, Socket.IO e Playwright. Não usa blockchain, extensões de carteira nem gateway real.

## Início rápido

```bash
npm install
npx playwright install chromium
npm run dev
```

Conta de demonstração: `rafael@example.com` / `Kurio123!`.

## Direção de conteúdo e navegação

Mercado e Criadores já estão disponíveis nas rotas `/mercado` e `/criadores`:

- **Início:** manter a vitrine atual, centrada nos NFTs, e incluir uma chamada genérica para criadores em destaque. Selecionar um criador leva à página Criadores.
- **Mercado:** descobrir coleções agrupadas a partir dos NFTs existentes, com busca por nome/criador, filtros por categoria/rede/criador e ordenação por novidades, quantidade ou nome. Os cards usam imagens e autoria dos NFTs da coleção; selecionar uma coleção abre a página dedicada `/colecoes/:collectionName`, com seus NFTs, informações, ordenação e paginação. A partir dali, detalhes e compra reutilizam os fluxos existentes. Não são exibidas métricas que não estejam nos dados.
- **Criadores:** diretório com busca e filtros por categoria, rede e coleção, além de ordenação por novidades, número de obras ou nome. Cada perfil em `/criadores/:creatorName` reúne os NFTs existentes daquele criador, com ordenação, paginação e links para coleções e detalhes. A foto de perfil vem da conta cujo nome de usuário corresponde ao identificador do criador; sem correspondência ou foto cadastrada, é exibida a inicial do nome. Os dados são agregados das obras já disponíveis; não são inventadas biografias ou métricas.
- **Aprenda:** conectar à seção Diário da Cunhagem do Início, evitando criar conteúdo editorial separado enquanto isso estiver fora do escopo.

## Comandos

```bash
npm run dev          # Vite com mocks
npm run build        # tipos + build de demonstração
npm run preview      # preview na porta 4173
npm run typecheck
npm run lint
npm run test:e2e
npm run audit:lighthouse
```

## Mocks e cenários

Os mocks MSW são ativados por `VITE_ENABLE_MOCKS=true`. O banco é persistido em `localStorage`; para voltar às fixtures, execute `POST /api/__mock/reset`.

Defina `VITE_MOCK_SCENARIO` ou acrescente `?mockScenario=` à URL. Cenários disponíveis: `default`, `empty-catalog`, `server-error`, `slow-network`, `session-expired`, `price-change`, `payment-declined`, `order-pending` e `timeout-after-order`.

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

A auditoria Lighthouse mede início e detalhe três vezes por perfil e grava relatórios em `reports/lighthouse`. Veja `docs/AUDITORIA.md`.

## Deploy

`vercel.json` preserva refresh e acesso direto às rotas SPA. Publique o mesmo commit com `npm run build`; confirme que `mockServiceWorker.js` está incluído no deploy.
# Arquitetura — Kurio NFT Marketplace

Este documento descreve como a solução está organizada, os contratos entre as camadas, as políticas de sessão, carrinho e cache, a reconciliação entre REST e Socket.IO, e as limitações e desvios conhecidos. Setup e comandos estão no [README](./README.md); a auditoria Lighthouse está em [docs/AUDITORIA.md](./docs/AUDITORIA.md).

## 1. Camadas

```text
UI (routes/, components/)
  └─ features/<domínio>/api.ts     funções tipadas que chamam o cliente HTTP
       └─ lib/http.ts (Axios)      único cliente REST; injeta token; trata SESSION_EXPIRED
            └─ rede ──► MSW (src/mocks)   handlers REST + socket mock, db persistido, cenários
realtime/socket.ts (socket.io-client) ◄── MSW (ws.link + @mswjs/socket.io-binding)
app/queryClient.ts                 política de cache; lib/money.ts  aritmética ETH (Decimal.js)
```

Regras que a estrutura garante:

- **Nenhuma resposta fictícia fora de `src/mocks`.** Componentes, hooks e o cliente Axios só conhecem contratos (`src/lib/contracts.ts`). Cenários de falha são decididos nos handlers (`readScenario()`), nunca na UI.
- **Roteamento** por arquivos com TanStack Router (`src/routes`, `routeTree.gen.ts` gerado). Busca, filtros, ordenação e paginação são *search params* validados com Zod (`features/catalog/search.ts`, `features/market/search.ts`); valores inválidos caem no padrão em vez de quebrar a página.
- **Estado remoto** exclusivamente em TanStack Query. Estado local de componente só para UI efêmera (drawer aberto, rascunho de campo).
- **Componentes de interface** em `src/components/ui` seguem o padrão shadcn/ui sobre Radix (ver §8).

## 1.1 Páginas e rotas da aplicação

A navegação é definida por arquivos em `src/routes/` e pelo TanStack Router. A lista abaixo reflete as rotas presentes no código; páginas auxiliares e seus limites estão descritos na seção 9.

| Rota | Página / responsabilidade | Observações |
|---|---|---|
| `/` | Início | Descoberta de NFTs, busca e filtros em destaque. |
| `/mercado` | Mercado | Catálogo com busca, filtros e ordenação. |
| `/nfts/$nftId` | Detalhe do NFT | Detalhes do item e ações relacionadas ao carrinho/favoritos. |
| `/colecoes/$collectionName` | Coleção | Descoberta de NFTs associados a uma coleção. |
| `/criadores` | Criadores | Página-base da área de criadores. |
| `/criadores/` | Índice de criadores | Lista agregada de criadores presentes nos dados. |
| `/criadores/$creatorName` | Detalhe do criador | NFTs associados ao criador; sem biografia ou métricas não disponíveis nos dados. |
| `/carrinho` | Carrinho | Itens, quantidades e aplicação/remoção de cupom; aceita visitante. |
| `/pagamento` | Pagamento / checkout | Cotação da API mock, seleção de carteira e criação de pedido. |
| `/pedidos/$orderId` | Acompanhamento do pedido | Consulta do pedido e atualização por REST/Socket.IO. |
| `/login` | Login | Autenticação simulada pelo serviço mock. |
| `/cadastro` | Cadastro | Criação de conta simulada pelo serviço mock. |
| `/perfil` | Perfil do colecionador | Consulta e edição dos dados do perfil. |
| `/carteiras` | Carteiras | Cadastro, edição, remoção e conexão simulada de carteiras. |
| `/interesse` | Interesses / favoritos | Exibe os NFTs favoritados pelo usuário autenticado. |
| `/ofertas` | Ofertas | Apresenta o cupom demonstrativo `KURIO10`; a validade é verificada ao aplicá-lo no carrinho. |
| `/aprenda` | Aprenda | Conteúdo editorial estático e filtros locais; sem integração externa. |
| `/atividade` | Atividade | Página auxiliar em estado vazio, sem listagem de pedidos no backend mock. |
| `/downloads` | Downloads | Página auxiliar em estado vazio, sem serviço de downloads implementado. |
| `/suporte` | Suporte | Formulário demonstrativo que salva a solicitação no `localStorage`; não envia mensagens a uma equipe. |

`/login`, `/cadastro` e as rotas privadas usam diálogos/controles e redirecionamentos descritos na seção de sessão. `/perfil`, `/carteiras`, `/pagamento` e `/pedidos/$orderId` exigem sessão. O carrinho também pode ser usado como visitante, com mescla após autenticação.

## 2. Contratos REST

Base: `/api`. Erros seguem `{ error: { code, message, fields? } }` (`ApiError`). Rotas privadas exigem `Authorization: Bearer <token>`.

| Recurso | Operação | Endpoint |
|---|---|---|
| Sessão e conta | cadastro / login / sessão / logout | `POST /auth/register`, `POST /auth/login`, `GET /auth/session`, `POST /auth/logout` |
| NFTs | listagem (busca, filtros, ordenação, paginação, *facets*) | `GET /nfts?q&categoria&rede&colecao&criador&precoMin&precoMax&ordenar&pagina&limite` |
| NFTs | detalhe | `GET /nfts/:nftId` |
| Favoritos | consulta / inclusão / remoção | `GET /favorites`, `PUT /favorites/:nftId`, `DELETE /favorites/:nftId` |
| Carrinho | consulta / substituição / mescla do visitante | `GET /cart`, `PUT /cart`, `POST /cart/merge` |
| Cupom | aplicar / remover | `POST /cart/coupon`, `DELETE /cart/coupon` |
| Cotação | preço, desconto, taxa e total | `POST /checkout/quote` |
| Pedidos | criar (idempotente) / consultar | `POST /orders` (header `Idempotency-Key`), `GET /orders/:orderId` |
| Perfil | consulta / atualização / senha | `GET /profile`, `PATCH /profile`, `POST /profile/password` |
| Carteiras | consulta / cadastro / edição / remoção | `GET /wallets`, `POST /wallets`, `PATCH /wallets/:walletId`, `DELETE /wallets/:walletId` |
| Carteiras | simulação de conexão e desconexão | `POST /wallets/:walletId/connect` (`{ approved }`), `DELETE /wallets/:walletId/connect` |

Endpoints de apoio (somente no ambiente de mocks): `GET /health`, `POST /__mock/reset`, `POST /__mock/nfts/:nftId/update`, `POST /__mock/nfts/:nftId/event`, `POST /__mock/orders/:orderId/update`, `POST /__mock/orders/:orderId/event`, `POST /__mock/socket/disconnect`.

**Tipos principais** (`src/lib/contracts.ts`): `SessionResponse`, `Profile`, `Wallet`, `Cart` (com `version`), `CartViewItem`, `Quote` (`quoteId`, `cartVersion`, `subtotalEth`, `discountEth`, `networkFeeEth`, `totalEth`, `expiresAt`), `Order` (`status`, `version`, `transactionRef`, `quote`, `items`, `walletAddress`, `walletNetwork`).

**Valores monetários.** ETH trafega como *string* decimal e é calculado com `decimal.js` (`lib/money.ts`: precisão de 40 dígitos, arredondamento para baixo). Quantidades são inteiras. A cotação do servidor é a referência para o pedido.

### Idempotência de pedidos

`POST /orders` exige `Idempotency-Key`. Para a mesma chave, o mesmo `quoteId` e a mesma carteira, o servidor devolve o mesmo pedido; com conteúdo diferente, retorna `409 IDEMPOTENCY_CONFLICT`. O cliente guarda a chave, a carteira e a cotação em `kurio.checkout-resume` por usuário antes de enviar. Assim, um *timeout*, um novo clique ou um refresh podem recuperar o pedido sem duplicar a compra.

## 3. Eventos Socket.IO

Cliente: `socket.io-client` em `src/realtime/socket.ts`, transporte `websocket`, `path: /socket.io`.

| Evento | Payload | Efeito no cliente |
|---|---|---|
| `nft.updated` | `{ eventId, resourceId, version, item }` | Atualiza o cache do NFT e invalida catálogo, carrinho e cotação ativos. |
| `order.updated` | `{ eventId, resourceId, userId, status, version, order }` | Atualiza o cache do pedido; a tela mostra confirmação ou recusa. |

Regras de aceitação:

1. **Duplicatas:** eventos com `eventId` já visto são descartados.
2. **Eventos antigos:** versões menores ou iguais à última conhecida são descartadas.
3. **Isolamento por usuário:** eventos de pedido só são aplicados se o usuário e os dados do evento corresponderem à sessão atual.
4. **Ciclo de vida:** trocar ou encerrar a sessão desconecta o socket e limpa o estado de eventos vistos.
5. **Reconexão:** o cliente reenvia a inscrição e reconcilia o estado por REST.

Pedidos `confirmed` e `declined` são terminais.

## 4. Sessão

- A sessão é armazenada em `localStorage` (`kurio.session`: usuário, token e `expiresAt`); sessões vencidas são descartadas localmente.
- O interceptor do Axios injeta o `Bearer` e trata `SESSION_EXPIRED`, limpando a sessão e guardando a rota para retomada quando aplicável.
- A sessão pode ser recuperada após refresh.
- `/perfil`, `/carteiras`, `/pagamento` e `/pedidos/$orderId` exigem sessão.
- O carrinho pode ser usado como visitante e mesclado após autenticação.

## 5. Carrinho e checkout

- O carrinho é gerido pela API mock e pelo TanStack Query.
- Alterações de quantidade, cupom e disponibilidade são validadas pelo serviço mock.
- A cotação é obtida pelo endpoint `/checkout/quote`.
- Mudanças de preço ou disponibilidade invalidam a cotação e exigem nova confirmação.
- A criação do pedido usa chave de idempotência para reduzir o risco de duplicação.
- O pedido pode ser acompanhado por REST e Socket.IO.
- O pagamento é demonstrativo; não movimenta dinheiro real nem executa transações blockchain.

## 6. Cache e sincronização

TanStack Query gerencia o estado remoto. Eventos Socket.IO atualizam o cache imediatamente, e consultas REST confirmam o estado. Na reconexão, o cliente reconcilia dados para recuperar eventos perdidos. Os dados de pedido são separados por usuário.

## 7. Mocking com MSW

- O MSW intercepta as chamadas REST e o transporte Socket.IO no ambiente de demonstração.
- Os dados mock são mantidos em `src/mocks`, com fixtures e banco persistido em `localStorage`.
- O cenário é configurado por `VITE_MOCK_SCENARIO` ou `?mockScenario=`.
- Cenários disponíveis incluem catálogo vazio, erro de servidor, falha de conexão, rede lenta, sessão expirada, falha ao favoritar, mudança de preço, conflito de disponibilidade, pagamento recusado, pedido pendente e timeout após criação do pedido.
- O Socket.IO usa `ws.link` e `@mswjs/socket.io-binding`; os testes exercitam o cliente `socket.io-client`.
- O mock não é um backend de produção: não há servidor Socket.IO real, salas ou persistência compartilhada entre usuários em dispositivos diferentes.

## 8. Interface compartilhada e acessibilidade

**Componentes shadcn/ui.** `src/components/ui` contém `Button`, `Dialog`, `Input`, `Label` e `Sonner`, adaptados ao padrão visual do projeto.

- Login e cadastro usam diálogos com gerenciamento de foco.
- O drawer de filtros mobile usa `Dialog` do Radix.
- Campos com erro usam `aria-invalid`, `aria-describedby` e mensagens com `role="alert"`.
- Mensagens de estado usam `role="status"`; notificações usam Sonner.
- Skeletons respeitam `prefers-reduced-motion`.
- Testes verificam overflow horizontal em diferentes larguras de tela.

**Filtros.** Início, Mercado e Criadores compartilham `FilterPanel` e `FilterToolbar`. Os filtros combinam seleção por OU dentro de um grupo e E entre grupos. Busca, filtros e ordenação são refletidos na URL nas telas correspondentes.

## 9. Limitações, decisões de UX e desvios

### Decisões de UX

- Mudanças de preço ou disponibilidade durante o checkout exigem nova confirmação.
- Mercado, Criadores e Coleções são páginas complementares construídas a partir dos dados existentes.
- O projeto usa Roboto e DM Mono locais porque os materiais do Figma não especificavam claramente a família tipográfica.
- As artes dos NFTs foram convertidas para WebP para reduzir o tamanho dos arquivos.

### Páginas complementares e seus limites

- **Mercado:** catálogo com busca, filtros e ordenação.
- **Criadores:** lista e detalhes de criadores derivados dos NFTs; não apresenta biografias ou métricas indisponíveis nos dados.
- **Coleções:** apresenta NFTs associados à coleção selecionada.
- **Aprenda:** conteúdo editorial estático com filtros locais, sem integração externa.
- **Ofertas:** apresenta o cupom demonstrativo `KURIO10`; sua validade é verificada quando aplicado no carrinho.
- **Interesse:** apresenta os NFTs favoritados pelo usuário autenticado.
- **Atividade:** página auxiliar em estado vazio, sem listagem de pedidos no backend mock.
- **Downloads:** página auxiliar em estado vazio, sem serviço de downloads implementado.
- **Suporte:** formulário demonstrativo que salva a solicitação no `localStorage`; não envia mensagens a uma equipe.

### Limitações conhecidas

- Os pagamentos, conexões de carteira e referências de transação são simulados.
- Não há transações reais em blockchain nem conexão com carteiras reais.
- Atividade e Downloads não possuem API de listagem implementada.
- O mock usa dados locais e não representa um backend compartilhado em produção.
- O marcador `passwordHash` nas fixtures é fictício e não deve ser utilizado em produção.
- O CSS principal contém regras acumuladas durante o desenvolvimento.
- A Performance mobile do Lighthouse ficou abaixo da meta de 90: 82 na Home e 84 no Detalhe. As medições e a análise estão em [docs/AUDITORIA.md](./docs/AUDITORIA.md).
- As baselines de testes visuais podem variar conforme o sistema operacional e as fontes instaladas.

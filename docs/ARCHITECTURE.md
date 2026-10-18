# Arquitetura — Kurio NFT Marketplace

Este documento descreve como a solução está organizada, os contratos entre as camadas, as políticas de sessão, carrinho e cache, a reconciliação entre REST e Socket.IO, e as limitações e desvios conhecidos. Setup e comandos estão no [README](./README.md); a auditoria Lighthouse está em [docs/AUDITORIA.md](./docs/AUDITORIA.md).

## 1. Camadas

```
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

**Tipos principais** (`src/lib/contracts.ts`, incluindo `Nft`, que o app e o mock compartilham; o mock só os reexporta): `SessionResponse`, `Profile`, `Wallet`, `Cart` (com `version`), `CartViewItem`, `Quote` (`quoteId`, `cartVersion`, `subtotalEth`, `discountEth`, `networkFeeEth`, `totalEth`, `expiresAt`), `Order` (`status`, `version`, `transactionRef`, `quote`, `items`, `walletAddress`, `walletNetwork`).

**Valores monetários.** ETH trafega como *string* decimal e é calculado com `decimal.js` (`lib/money.ts`: precisão de 40 dígitos, arredondamento para baixo). Quantidades são inteiras. A cotação do servidor é a referência para o pedido.

**Códigos de erro por categoria**

| Situação | HTTP | Códigos |
|---|---|---|
| Validação | 400 / 409 / 422 | `INVALID_INPUT`, `INVALID_PROFILE`, `INVALID_PASSWORD`, `INVALID_WALLET_ADDRESS`, `EMAIL_EXISTS`, `WALLET_EXISTS`, `INVALID_COUPON`, `COUPON_EXPIRED` |
| Sessão inválida/expirada | 401 | `SESSION_EXPIRED`, `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| Recurso inexistente | 404 | `NFT_NOT_FOUND`, `ORDER_NOT_FOUND`, `WALLET_NOT_FOUND`, `CART_NOT_FOUND` |
| Conflito de disponibilidade/cotação | 409 | `AVAILABILITY_CONFLICT`, `QUOTE_OUTDATED`, `EDITION_DUPLICATE`, `WALLET_NOT_CONNECTED`, `ORDER_TERMINAL` |
| Idempotência | 400 / 409 | `MISSING_IDEMPOTENCY_KEY`, `IDEMPOTENCY_CONFLICT` |
| Falha transitória | 503 / rede | `SERVICE_UNAVAILABLE`, `HttpResponse.error()` |

### Idempotência de pedidos

`POST /orders` exige `Idempotency-Key`. Para a mesma chave, o mesmo `quoteId` e a mesma carteira, o servidor devolve **o mesmo pedido** (200); com conteúdo diferente, `409 IDEMPOTENCY_CONFLICT`. O cliente guarda a chave, a carteira e a cotação em `kurio.checkout-resume` (por usuário) antes de enviar; por isso um *timeout* (cenário `timeout-after-order`), um novo clique ou um refresh reenviam a mesma chave e recuperam o pedido sem duplicar a compra. Assim que o `POST /orders` devolve um pedido (em qualquer estado), a chave é descartada e a tela passa a `/pedidos/:orderId`, que consulta o pedido por `GET /orders/:id`; um pedido `pending` é então acompanhado por `order.updated` e reconciliado por REST.

## 3. Eventos Socket.IO

Cliente: `socket.io-client` em `src/realtime/socket.ts`, transporte `websocket`, `path: /socket.io`.

| Evento | Payload | Efeito no cliente |
|---|---|---|
| `nft.updated` | `{ eventId, resourceId, version, item }` | atualiza `["nft", id]`, invalida catálogo, carrinho e cotação ativos |
| `order.updated` | `{ eventId, resourceId, userId, status, version, order }` | atualiza `["order", userId, id]`; a tela de pedido mostra confirmação ou recusa |

Regras de aceitação:

1. **Duplicatas:** `eventId` já visto é descartado.
2. **Eventos antigos:** `version` menor ou igual à última conhecida (vista por evento ou presente no cache) é descartada; um estado mais recente nunca regride.
3. **Isolamento por usuário:** `order.updated` só é aplicado se `event.userId` for o da sessão atual e se o payload for coerente (`resourceId === order.id`, `status === order.status`, `version === order.version`). O servidor mock só entrega o evento a conexões que enviaram `subscribe` com aquele `userId`.
4. **Ciclo de vida:** trocar ou encerrar a sessão chama `disconnectRealtime()` (fecha o socket, limpa versões e IDs vistos) e reconecta apenas se houver sessão.
5. **Reconexão:** no evento `connect` o cliente reenvia `subscribe` e **reconcilia por REST** (ver §6).

Pedidos `confirmed` e `declined` são terminais.

## 4. Sessão

- Armazenada em `localStorage` (`kurio.session`: usuário, token, `expiresAt`). `getSession()` descarta sessões vencidas localmente.
- O interceptor do Axios injeta o `Bearer` e, ao receber `SESSION_EXPIRED`, grava a rota atual em `kurio.resume-path`, limpa a sessão e dispara `kurio:session-expired`. Se a requisição com 401 acontece quando o usuário já está em `/login` ou `/cadastro`, nada é gravado, para não devolver o usuário ao login depois de entrar. Após novo login, o usuário retorna à rota salva; o contexto do checkout é preservado em `kurio.checkout-resume`.
- A sessão é recuperável após refresh. As rotas `/pagamento`, `/perfil`, `/carteiras` e `/pedidos/:orderId` redirecionam ao login (`beforeLoad`) quando não há sessão; `/carrinho` aceita visitante, e favoritos exigem login na ação.
- **Logout e troca de usuário:** o evento `kurio:session-change` remove do cache as queries privadas (`profile`, `wallets`, `favorites`, `cart`, `quote`, `order`) e reinicia o socket. Todas essas chaves incluem o `userId`, então dados de um usuário nunca são lidos por outro. Há teste E2E de troca de usuário sem recarregar a página.
- Senhas: o mock guarda apenas um *hash* curto de 8 caracteres (`passwordHash`), nunca a senha em claro. É uma simulação — não é um mecanismo de segurança (ver §9).

## 5. Carrinho

- **Visitante:** itens em `localStorage` (`kurio.cart.v1`) via `features/cart/storage.ts`.
- **Autenticado:** o carrinho vive na API (`GET/PUT /cart`), com `version` incrementada a cada alteração. Ao entrar ou cadastrar, o carrinho do visitante é enviado a `POST /cart/merge` e o resultado passa a ser a fonte da verdade.
- A API valida disponibilidade por NFT e edição (`AVAILABILITY_CONFLICT`, `INVALID_EDITION`, `EDITION_DUPLICATE`).
- O resumo (subtotal, desconto, taxa de rede, total) vem sempre de `POST /checkout/quote`, nunca de cálculo local. A chave da cotação inclui `cart.version`, então mudar o carrinho gera nova cotação.
- Alterações de preço/disponibilidade recebidas por `nft.updated` invalidam carrinho e cotação; a interface informa a mudança e atualiza o resumo.
- Depois de um pedido confirmado, o mock esvazia o carrinho. Como o pedido cobre o carrinho inteiro (a cotação é do carrinho todo), isso equivale a remover exatamente os itens e quantidades comprados; em falha ou recusa o carrinho é preservado.

## 6. Cache e reconciliação REST ↔ Socket.IO

**Política (`app/queryClient.ts`)**

| Item | Valor | Motivo |
|---|---|---|
| `staleTime` | 30 s | o catálogo tolera pequena defasagem; o socket invalida o que muda |
| `gcTime` | 5 min | navegação de ida e volta sem refetch desnecessário |
| `retry` (queries) | até 2 vezes, **nunca em 4xx** | só falhas transitórias merecem nova tentativa |
| `retry` (mutations) | desligado | evita operações duplicadas; pedidos usam idempotência explícita |
| `refetchOnWindowFocus` | desligado | atualização é guiada por eventos e invalidação, não por foco |

**Chaves de query:** `["nfts", search]` (os parâmetros da URL entram na chave), `["nft", id]`, `["cart", userId]`, `["quote", userId, cartVersion]`, `["order", userId, orderId]`, `["favorites", userId]`, `["wallets", userId]`, `["profile", userId]`, `["market-collections"]`, `["market-creators"]`.

**Respostas fora de ordem:** o `queryFn` do catálogo recebe o `AbortSignal` do TanStack Query e o repassa ao Axios; como a chave inclui os parâmetros, uma resposta atrasada de uma busca anterior nunca sobrescreve a atual (cenários `out-of-order` e `variable-latency`).

**Atualização otimista:** favoritos (`routes/nfts.$nftId.tsx`) — `onMutate` cancela consultas, grava o novo estado e guarda o anterior; `onError` faz *rollback* e informa a falha (cenário `favorite-failure`).

**Reconciliação.** Após cada evento aceito e a cada `connect`/reconexão, `reconcileActiveResources()` invalida com `refetchType: "active"` as queries `nfts`, `cart`, `quote` e `order` do usuário atual. O evento atualiza o cache de imediato (resposta rápida) e a REST confirma em seguida (fonte da verdade). Se um evento for perdido durante uma queda, a reconexão corrige o estado; pedidos pendentes são recuperados por `GET /orders/:id`.

## 7. Mocking com MSW

- **Inicialização (`main.tsx`):** o Service Worker do MSW sobe **em paralelo** ao carregamento do app, e o app é renderizado sem esperar por ele (shell e skeletons aparecem primeiro). Uma porta de rede (`src/lib/network-ready.ts`) faz o cliente Axios e o Socket.IO aguardarem o MSW antes da primeira requisição, então nenhuma chamada escapa para a origem real. O `socket.io-client` captura o `WebSocket` global ao ser importado, por isso é carregado sob demanda em `realtime/socket.ts`, só depois do start do MSW (uma conexão pedida e cancelada durante o carregamento é descartada). A porta não carrega dados nem regras de negócio: é só um sinal de "rede pronta". Ativação por `VITE_ENABLE_MOCKS=true`; o build de demonstração usa `--mode mock`, que lê o `.env.mock` versionado.
- **Pré-carregamento no HTML (`vite.config.ts`):** o plugin `kurio-preload-boot-assets` injeta `modulepreload` para os chunks do MSW e do app (e suas dependências) e `preload` para as fontes Roboto 400/500/700. O chunk do MSW e as fontes entram com `fetchpriority="low"`, para não disputar banda com o JavaScript do app em rede lenta. Um script inline escolhe pelo `pathname` os chunks da rota (`/` e `/nfts/:id`) e os pré-carrega. Sem isso esses arquivos só eram descobertos depois do JS de entrada (cascata) e, com `font-display: optional`, a primeira visita caía na fonte de fallback. Efeito medido em [docs/AUDITORIA.md](./docs/AUDITORIA.md).
- **Banco** em `src/mocks/db`, persistido em `localStorage` para sobreviver a refresh; `POST /api/__mock/reset` restaura as fixtures (`src/mocks/fixtures`, 2 usuários e catálogo variado).
- **Cenários** (`VITE_MOCK_SCENARIO` ou `?mockScenario=`): `default`, `empty-catalog`, `server-error`, `connection-failure`, `slow-network`, `variable-latency`, `out-of-order`, `session-expired`, `favorite-failure`, `price-change`, `availability-change`, `stock-conflict`, `payment-declined`, `order-pending`, `timeout-after-order`. O `slow-network` atrasa também o carrinho e a cotação em 1,2 s, para os skeletons dessas telas ficarem visíveis nos testes.
- **Transporte Socket.IO:** `ws.link(origin)` + `toSocketIo()` de `@mswjs/socket.io-binding`. O MSW remove o prefixo `/socket.io/` do handshake, então os canais apontam para a origem da página. As mudanças simuladas passam pelo mesmo estado do REST (`db.updateNft` → `emitNftUpdated`), e os testes exercitam o `socket.io-client` real.
- **Limitações do ambiente de mocks:** não existe servidor Socket.IO — o canal só funciona enquanto a página está aberta e o Service Worker está ativo; não há salas, *acknowledgements* nem *polling* (apenas `websocket`); as origens `ws://localhost:5173`/`4173` e a origem atual são registradas explicitamente; a desconexão é simulada fechando o lado cliente do interceptor; o banco é por navegador (não compartilhado entre abas de usuários diferentes além do `localStorage`).

## 8. Interface compartilhada

**Componentes shadcn/ui.** `src/components/ui` contém `Button`, `Dialog`, `Input`, `Label` e `Sonner`, no padrão shadcn sobre Radix (`@radix-ui/react-dialog`, `@radix-ui/react-label`, `sonner`), com as classes e a identidade visual do projeto.

- **Login e cadastro** são `Dialog` do Radix: foco inicial no primeiro campo, Tab preso, Escape fecha e o foco volta a quem abriu.
- **Drawer de filtros no mobile** é um `Dialog` do Radix enquanto está aberto; fechado e no desktop é o mesmo `aside` do painel. O título do `Dialog` é um `span` oculto, para não duplicar o título visível "Filtros". Ao fechar, o foco volta ao botão "Filtros" (`onCloseAutoFocus`, pelo `aria-controls`).
- **`Input`** define `aria-invalid` e `aria-describedby` quando há erro; a mensagem vem num `FieldError` com `role="alert"`. Isso vale para login, cadastro, perfil, carteiras e pagamento (carteira não selecionada ou desconectada, com foco movido ao campo).
- **`Toaster` (Sonner)** está montado em `app/providers.tsx` e informa a falha ao adicionar ao carrinho no detalhe do NFT. As demais mutações (perfil, carteiras, favoritos) mantêm mensagens `role="status"` na própria tela.
- Nos formulários de perfil e carteiras, os campos dentro de `<label>` têm `aria-label` com o mesmo texto, para que a mensagem de erro não entre no nome acessível do campo.

**Skeletons.** Catálogo, carrinho e pagamento têm skeleton com *shimmer* (`commerce-skeleton.tsx` para carrinho e pagamento), com as mesmas classes de layout das telas reais para não deslocar o conteúdo. O *shimmer* é desligado com `prefers-reduced-motion`. Os testes E2E conferem posição do título, largura do resumo e altura dos itens.

**Painel de filtros único.** Início, Mercado e Criadores renderizam `FilterPanel` + `FilterToolbar` (`src/components/catalog-filters.tsx`), com o markup e as classes do painel do Início (`filters`, `filter-group`, `filter-option`, `price-slider`, drawer mobile). Cada tela só declara seus grupos:

| Tela | Busca | Grupos de checkbox | Extras |
|---|---|---|---|
| Início | campo na barra mobile e busca do cabeçalho | Coleções (categorias), Rede | faixa de preço, NFT em destaque |
| Mercado | no painel | Categorias, Rede, Criador | — |
| Criadores | no painel | Categoria das obras, Rede blockchain, Coleção | — |

Seleção múltipla combina por **OU dentro do grupo** e **E entre grupos**. Mercado e Criadores guardam o estado na URL (`q`, `categoria`, `rede`, `criador`/`colecao`, `ordenar`), como o Início. Faixa de preço fica só no Início porque Mercado e Criadores não possuem preço nos dados agregados.

**Outras garantias de acessibilidade:** a contagem de resultados é uma região `role="status"`; checkboxes têm rótulo; imagens relevantes têm texto alternativo; skeletons respeitam `prefers-reduced-motion`; testes verificam ausência de overflow horizontal em 390, 768 e 1440 px.

## 9. Limitações, decisões de UX e desvios

**Decisões de UX**
- Mudança de preço/disponibilidade durante o checkout exige nova confirmação: a cotação antiga é rejeitada com `QUOTE_OUTDATED` e a interface pede revisão.
- Mercado e Criadores existem como descoberta complementar (coleções e criadores agregados dos NFTs existentes). Não exibem métricas ou biografias que não estejam nos dados.

**Desvios em relação ao enunciado/Figma**
- **Fonte:** o nome da fonte do Figma não foi informado nos materiais. A interface usa Roboto, servida localmente por `@fontsource/roboto`, e a navbar usa DM Mono (`@fontsource/dm-mono`, também local). Se o Figma usar outra família, este é um desvio a ajustar.
- **Assets de imagem:** as quatro artes usadas nos cards e nas páginas (250 × 250 px) foram convertidas de PNG para WebP (qualidade 85), de ≈ 110 kB para ≈ 10 kB cada, sem mudar dimensões nem composição. A troca é só de formato, feita por desempenho (ver [docs/AUDITORIA.md](./docs/AUDITORIA.md)); os PNGs originais deixaram de ser usados e foram removidos do projeto. O pacote contém as artes WebP em `public/nfts/`; compare a identidade de cada arquivo com o Figma antes da entrega, pois o ZIP não inclui um manifesto de exportação do Figma que permita comprovar um mapeamento de nomes de origem.
- **Navbar e cards:** navbar fixa (`position: sticky`) com links centralizados e botão Entrar com ícone; o card de NFT tem um único bloco (fundo e borda) que envolve imagem, nome e preço.
- **Telas adicionais e comportamento fora do escopo:** Mercado, Criadores, Coleções e Aprenda foram adicionados como navegação complementar. Aprenda apresenta conteúdo editorial estático e filtros locais, sem alegar integração externa. Suporte salva solicitações apenas no `localStorage` e informa explicitamente que elas não são enviadas a uma equipe. Ofertas apresenta o cupom de demonstração `KURIO10`; a validade só é confirmada quando ele é aplicado no carrinho. Interesse apresenta os favoritos reais do usuário e reutiliza um fluxo funcional obrigatório. Atividade e Downloads são páginas auxiliares sem backend de listagem; devem indicar claramente a ausência de dados/serviço, sem simular sucesso.
- **Ajustes de acessibilidade em relação ao layout:** erros de formulário ligados aos campos (`aria-invalid`, `aria-describedby`, `role="alert"`), `aria-label` em campos dentro de `<label>`, foco controlado em diálogos e no drawer, feedback `role="status"` e `Toaster` para mutações, e *shimmer* desligado com movimento reduzido.

**Limitações conhecidas**
- Dos componentes shadcn/ui, estão adaptados `Button`, `Dialog`, `Input`, `Label` e `Sonner`. Outros elementos (seletor de quantidade, `select` do pagamento, cards e checkboxes de filtro) são componentes próprios com Tailwind/CSS.
- Atividade e Downloads (fora do escopo) são páginas de estado vazio, sem dados nem ações simuladas: a API só expõe `GET /orders/:orderId`, sem listagem de pedidos.
- `transactionRef` do pedido reaproveita a chave de idempotência; a referência de transação é simulada.
- O filtro de preço do mock compara com `Number()`; só a camada de mock é afetada (o cliente trata ETH como string).
- **Hash de senha nas fixtures:** `passwordHash` é o literal curto `b9ead502` nos dois usuários de demonstração. É um marcador/hash fictício para simulação, não uma senha em claro nem um hash criptograficamente seguro. Não deve ser reutilizado em produção; autenticação real exige hashing de senhas apropriado com salt.
- `src/index.css` é um arquivo único e extenso, com regras sobrepostas ao longo do desenvolvimento; as regras antigas `.market-filters`/`.creators-filters` não são mais usadas.
- Performance mobile abaixo da meta (82 no Início e 84 no Detalhe contra 90): causa e medições em [docs/AUDITORIA.md](./docs/AUDITORIA.md).
- Regressão visual: as baselines dependem de SO e fontes; gere-as no mesmo ambiente em que serão comparadas.
# Arquitetura do Kurio

O projeto usa uma organização por domínio (`features`) combinada com rotas de arquivo do TanStack Router. As rotas continuam em `src/routes` porque o plugin do TanStack Router gera a árvore a partir dessa pasta.

## Estrutura principal

- `src/app`: inicialização dos providers, cliente TanStack Query e configuração do router.
- `src/routes`: arquivos de rota e composição visual das páginas. Devem coordenar consultas/mutações e apresentar os estados da interface, delegando acesso a dados aos módulos de domínio.
- `src/features/auth`: API de login/cadastro/merge do carrinho visitante e persistência da sessão.
- `src/features/catalog`: schema de busca sincronizada com a URL e serviço de consulta do catálogo.
- `src/features/nft-detail`: consultas para detalhe e NFTs relacionados.
- `src/features/favorites`: operações de leitura e atualização de favoritos.
- `src/features/cart`: API de carrinho/cupom/cotação e persistência do carrinho visitante.
- `src/features/checkout`: operações de checkout e recuperação segura da tentativa de compra.
- `src/features/orders`: consulta de pedidos e armazenamento local legado de pedidos, separado do contrato da API.
- `src/features/profile`: consultas e mutations do perfil e alteração de senha.
- `src/features/wallets`: operações de listagem, cadastro, edição e remoção de carteiras.
- `src/lib`: infraestrutura compartilhada, como Axios (`http.ts`), contratos de API, cálculos monetários, variáveis de ambiente e utilitários genéricos.
- `src/components`: layout e componentes reutilizáveis da interface.
- `src/mocks`: fixtures, banco de dados de demonstração, handlers REST, cenários e binding de Socket.IO/MSW.
- `src/realtime`: cliente Socket.IO, reconciliação do cache e eventos de ciclo de conexão.

## Direção das dependências

As páginas em `routes` importam serviços de `features`. Os serviços usam o cliente Axios compartilhado em `lib/http.ts` e os tipos comuns de `lib/contracts.ts`. A camada de mocks intercepta as chamadas REST sem exigir alterações na interface.

Os arquivos `src/routeTree.gen.ts` e as importações de rota são gerados pelo TanStack Router. Não mova os arquivos de rota para `features`; mova para `features` a lógica reutilizável e específica de cada domínio.

## Cache e consistência

Consultas usam `staleTime` de 30 segundos; mutations não têm retry para não duplicar compras. Falhas transitórias têm até duas tentativas e erros 4xx não são repetidos. Favoritos usam atualização otimista com rollback. Eventos `nft.updated` invalidam catálogo, carrinho e cotação; o checkout exige uma cotação atual no envio. Eventos `order.updated` carregam identidade, usuário proprietário, estado e versão do pedido. O cliente descarta duplicatas e versões antigas, atualiza o cache privado do pedido e, ao reconectar, reconcilia pedidos ativos pela API REST. Pedidos confirmados e recusados são terminais.

## Sessão e privacidade

A sessão fica em `localStorage` apenas com token e perfil público. O interceptor Axios limpa uma sessão que receba `SESSION_EXPIRED`, remove caches privados via `SESSION_EVENT` e conserva a rota para retomada depois do login. Senhas só existem como hash nas fixtures/mock DB.

O checkout persiste a chave idempotente, a carteira e a cotação antes do envio. Se a resposta expirar depois de o servidor registrar o pedido, uma repetição ou refresh reenviará os mesmos dados e recuperará o mesmo pedido.

## Socket.IO no MSW

No modo mock, o bootstrap inicia o MSW antes de importar a árvore que importa `socket.io-client`. Isso é necessário porque o Engine.IO captura a implementação global de `WebSocket` durante a carga do módulo. O binding `@mswjs/socket.io-binding` simula o protocolo para `nft.updated` e `order.updated`; eventos de pedido são entregues somente ao socket inscrito para o usuário proprietário. Recursos como rooms e namespaces não são necessários nesta demonstração.

## Limitações conhecidas

A fidelidade visual deve ser validada no Figma durante revisão manual. O deploy público exige credenciais da plataforma escolhida; nenhum segredo é armazenado neste repositório.

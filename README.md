# Kurio — NFT Marketplace

Aplicação de demonstração de um marketplace de NFTs construída com React e TypeScript, baseada no desafio de frontend e no layout do [Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).

O projeto implementa catálogo, busca e filtros, detalhe do NFT, favoritos, carrinho, checkout simulado, pedidos, conta do colecionador e atualizações em tempo real simuladas. **Não realiza transações em blockchain, não conecta carteiras reais e não processa pagamentos reais.** O modo de demonstração usa MSW para simular REST e Socket.IO, sem depender de backend privado.

## Requisitos

- Node.js compatível com Vite 5 (recomenda-se Node.js 20 LTS).
- npm.
- Chromium instalado pelo Playwright para executar os testes E2E.

## Executar localmente

```bash
npm install
npm run dev
```

O servidor de desenvolvimento inicia em modo `mock` e usa as variáveis versionadas de `.env.mock`. A aplicação normalmente fica disponível em `http://localhost:5173`.

Para validar o build de demonstração:

```bash
npm run build
npm run preview
```

O preview fica em `http://localhost:4173`. Os mocks precisam continuar habilitados para que os fluxos de demonstração funcionem.

## Contas fictícias

| E-mail | Senha |
|---|---|
| `rafael@example.com` | `Kurio123!` |
| `marina@example.com` | `Kurio123!` |

São contas e credenciais exclusivas para demonstração local; não use senhas pessoais. Os dados mock persistidos no navegador podem ser removidos pelo reset descrito abaixo.

## Variáveis de ambiente

O arquivo `.env.mock` é versionado e não contém segredos. Os comandos `npm run dev` e `npm run build` selecionam esse modo explicitamente.

| Variável | Valor padrão em `.env.mock` | Finalidade |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Habilita handlers MSW para REST e Socket.IO simulado. Deve permanecer habilitada no build demonstrativo. |
| `VITE_MOCK_SCENARIO` | `default` | Define o cenário inicial dos mocks. Também pode ser alterado pela query `?mockScenario=`. |
| `VITE_API_BASE_URL` | `/api` | Caminho-base do cliente REST. |
| `VITE_SOCKET_URL` | `ws://localhost:5173` | URL de configuração do cliente Socket.IO; no modo mock, a conexão usa a origem da aplicação. |

Não coloque chaves, senhas reais ou outros segredos em variáveis `VITE_*`: elas são incorporadas ao código entregue ao navegador. O modo `dev:real` não é o caminho de demonstração e depende de um serviço real compatível.

## Funcionalidades e limites

- **Início e catálogo:** busca, filtros, ordenação, paginação e acesso aos detalhes.
- **Detalhe do NFT:** galeria, informações, favoritos, quantidade e início da compra.
- **Carrinho e checkout:** alteração de quantidades, remoção, cupom demonstrativo, seleção de carteira/rede simuladas, cotação e envio de pedido simulado.
- **Conta:** login, cadastro, perfil e carteiras fictícias; os dados do mock são separados por usuário.
- **Tempo real:** o cliente usa `socket.io-client`; no modo de demonstração, os eventos são simulados por MSW, não por um servidor Socket.IO público.
- **Páginas auxiliares:** Suporte guarda solicitações no `localStorage` deste navegador e não as envia a uma central real. Ofertas e cupom são demonstrativos. Atividade e Downloads não representam um histórico de backend. Consulte `ARCHITECTURE.md` para limitações e decisões adicionais.

## Mocks, cenários e reset

Os cenários disponíveis são: `default`, `empty-catalog`, `server-error`, `connection-failure`, `slow-network`, `variable-latency`, `out-of-order`, `session-expired`, `favorite-failure`, `price-change`, `availability-change`, `stock-conflict`, `payment-declined`, `order-pending` e `timeout-after-order`.

Para iniciar a aplicação com um cenário específico, acrescente-o à URL, por exemplo:

```text
http://localhost:5173/?mockScenario=payment-declined
```

Para restaurar os dados de demonstração, envie `POST /api/__mock/reset` enquanto a aplicação estiver aberta no mesmo ambiente. Também é possível usar o console do navegador ou um cliente HTTP apontando para a origem local. Após o reset, recarregue a página.

Operações auxiliares para testes de eventos e pedidos:

- `POST /api/__mock/nfts/:nftId/update`, com `priceEth` e/ou `available`, altera um NFT no mock e pode disparar a atualização correspondente.
- `POST /api/__mock/orders/:orderId/update`, com `{"status":"confirmed"}` ou `{"status":"declined"}`, altera o estado de um pedido pendente.

O cenário `slow-network` atrasa respostas do catálogo, carrinho e cotação para permitir validar os estados de carregamento. Os cenários de falha permitem testar recuperação e mensagens de erro sem um serviço externo.

## Comandos

```bash
npm run dev                # Desenvolvimento com mocks
npm run build              # Verificação de tipos + build de demonstração
npm run preview            # Servir o build localmente na porta 4173
npm run typecheck          # Verificação TypeScript
npm run lint               # ESLint
npm run test:e2e           # Testes Playwright
npm run test:e2e:ui        # Playwright em modo interativo
npm run test:visual        # Regressão visual
npm run test:visual:update # Atualizar baselines visuais (revisar antes de versionar)
npm run audit:lighthouse   # Auditoria Lighthouse; exige build e preview ativos
npm run audit:summary      # Resumo das medições Lighthouse existentes
```

Instale o navegador de testes uma vez antes de rodar Playwright:

```bash
npx playwright install chromium
```

Os testes E2E usam um worker porque compartilham um banco mock persistido. Em caso de falha, consulte `test-results/` e o relatório gerado pelo Playwright. As baselines de `e2e/__screenshots__/` devem ser comparadas e versionadas intencionalmente; diferenças de sistema operacional, fontes e antialiasing podem afetar as imagens.

## Sessão, carrinho e sincronização

- Sessões, favoritos, perfil, carteiras, carrinho e pedidos são isolados por usuário.
- Quando a sessão expira, a rota de origem é preservada e retomada após novo login.
- O carrinho de visitante é mesclado à conta após autenticação.
- Preço e disponibilidade são tratados como strings decimais; a cotação do mock é a referência para a criação do pedido.
- O checkout persiste a chave de idempotência, a carteira e a cotação. Se o pedido for criado mas a resposta sofrer timeout, repetir a operação ou recarregar recupera o mesmo pedido sem duplicar a compra.
- Eventos `nft.updated` e `order.updated` carregam identificadores/versões; eventos duplicados ou antigos são descartados, e os dados relevantes são reconciliados após eventos ou reconexão.

Os contratos REST e de eventos, a política de sessão, o estado do carrinho, a estratégia de cache e a reconciliação REST/Socket.IO estão descritos em [ARCHITECTURE.md](./ARCHITECTURE.md).

## Auditoria e estado de performance

A auditoria Lighthouse registrada em 18/10/2026 está em [docs/AUDITORIA.md](./docs/AUDITORIA.md), com medianas de três execuções por página/perfil e relatórios HTML/JSON em `reports/lighthouse/`.

- Desktop: Performance 99 nas páginas Início e Detalhe.
- Mobile: Performance 82 no Início e 84 no Detalhe; **a meta definida no desafio é 90 e ainda não foi atingida**.
- Accessibility, Best Practices e SEO: 100 em todas as combinações medidas.

Os valores podem variar conforme ambiente e devem ser atualizados após novas medições. A auditoria documenta o diagnóstico de LCP mobile e as próximas otimizações a validar.

## Deploy

A configuração `vercel.json` encaminha as rotas da SPA para `index.html` para permitir acesso direto e refresh. Para publicar, use o build de demonstração com mocks habilitados e confirme que `mockServiceWorker.js` está incluído no artefato. Depois do deploy, valide em uma janela anônima: carregamento inicial, refresh de rotas, login, catálogo, favorito, carrinho, checkout, confirmação/pedido pendente e pelo menos um cenário de falha.

O deploy público é requisito do desafio. A URL publicada deve corresponder ao commit entregue e permanecer acessível durante a avaliação. Este README não afirma que o deploy foi validado; registre aqui a URL pública e o link do repositório antes de enviar a candidatura/entrega.

## Documentação complementar

- [ARCHITECTURE.md](./ARCHITECTURE.md): arquitetura, contratos, decisões de UX, limitações e desvios conhecidos.
- [docs/AUDITORIA.md](./docs/AUDITORIA.md): resultados Lighthouse, ambiente, diagnóstico de LCP e próximos passos.

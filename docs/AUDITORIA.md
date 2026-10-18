# Auditoria Lighthouse

Execute `npm run build`, inicie `npm run preview` em outro terminal e rode `npm run audit:lighthouse`. O script executa três medições para `/` e `/nfts/nft-002` nos perfis desktop e mobile e salva HTML/JSON em `reports/lighthouse`. `npm run audit:summary` calcula as medianas a partir dos JSONs existentes.

## Execução registrada — 18/10/2026

Medições feitas sobre o build de demonstração em modo mock, servido em `http://localhost:4173`. Cada valor é a mediana de três execuções por página e perfil.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Início | Desktop | 99 | 100 | 100 | 100 | 589 ms | 901 ms | 0,000 | 0 ms |
| Início | Mobile | 82 | 100 | 100 | 100 | 2.730 ms | 4.158 ms | 0,000 | 16 ms |
| Detalhe | Desktop | 99 | 100 | 100 | 100 | 550 ms | 801 ms | 0,000 | 0 ms |
| Detalhe | Mobile | 84 | 100 | 100 | 100 | 2.860 ms | 3.686 ms | 0,000 | 79 ms |

**Ambiente:** Windows 10 x64, Chrome 155 e Lighthouse 12.8.2. O perfil mobile usa throttling DevTools (CPU 4×, RTT 150 ms, throughput aproximado de 1,6 Mbps); desktop usa o preset do Lighthouse. Os 12 relatórios HTML/JSON e `execution-log.json` estão em [`reports/lighthouse`](../reports/lighthouse/). O resumo foi reproduzido a partir dos arquivos presentes no ZIP em 18/10/2026; uma execução de Início mobile precisou de nova tentativa após falha do Chrome, sem reduzir o número final de medições válidas (3 por combinação).

## Resultado frente às metas

O enunciado define Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95 e SEO ≥ 90.

- **Accessibility, Best Practices e SEO:** atingidas em todas as páginas/perfis (100).
- **Performance desktop:** atingida (99 em ambas as páginas).
- **Performance mobile:** ainda abaixo da meta: 82 no Início e 84 no Detalhe. Não declarar a meta de 90 como atingida.

## Análise do LCP mobile

Os relatórios atuais apontam como elemento LCP uma imagem do catálogo no Início (`NFT Artwork 03.webp`) e a imagem principal do detalhe (`NFT Artwork 04.webp`). Em ambos os casos, o recurso não é descoberto no documento HTML inicial porque a aplicação é uma SPA e o elemento só passa a existir depois da inicialização e da resposta da API mock. O atributo `fetchpriority="high"` está presente no elemento LCP do Início, mas isso não elimina o atraso até a descoberta do recurso.

Na segunda execução mobile de referência, a decomposição do LCP aponta **resource load delay de aproximadamente 2.449 ms no Início** e **3.483 ms no Detalhe**. O download em si fica em aproximadamente 901 ms no Início e 146 ms no Detalhe. Isso indica que a prioridade de investigação é reduzir o atraso para descobrir/iniciar o recurso LCP, sobretudo no detalhe; não é evidência de que o tamanho do arquivo seja a única causa. Esses valores são amostras de diagnóstico, não medianas das três execuções.

O app já renderiza o shell enquanto o MSW inicializa e usa uma porta de rede para evitar que as primeiras chamadas REST/Socket.IO escapem antes de o mock estar pronto. Portanto, não atribuir todo o atraso atual simplesmente a “esperar o MSW”: os relatórios mais recentes mostram também a descoberta tardia das imagens no fluxo renderização → rota/dados → elemento de imagem.

## Próximas otimizações a validar

- Avaliar uma estratégia de preload/prioridade para a imagem LCP de cada rota, sem carregar imagens desnecessárias em outras rotas.
- Avaliar a cadeia de dependências entre CSS/fontes, chunks da rota e primeira resposta REST; confirmar cada hipótese com novos relatórios.
- Reexecutar `npm run audit:lighthouse` e `npm run audit:summary` após qualquer mudança. Manter três medições válidas por página/perfil e atualizar esta tabela apenas com os resultados medidos.

As otimizações acima ainda não estão registradas como aplicadas. A auditoria deve continuar usando o build funcional completo com mocks, sem simplificações exclusivas para aumentar a pontuação.

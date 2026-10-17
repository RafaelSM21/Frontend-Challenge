# Auditoria Lighthouse

Execute `npm run build`, inicie `npm run preview` em outro terminal e rode `npm run audit:lighthouse`.

O script executa três medições para `/` e `/nfts/nft-002` nos perfis desktop e mobile e salva HTML/JSON em `reports/lighthouse`. Reporte a mediana de Performance, Accessibility, Best Practices, SEO, LCP, CLS e TBT no envio final, junto com versão do Chrome/Lighthouse e condições da máquina.

## Execução registrada — 17/10/2026

Execução feita sobre o build de produção em modo mock, servido em `http://localhost:4173`. Cada valor abaixo é a mediana de três medições:

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Início | Desktop | 99 | 100 | 100 | 100 | 887 ms | 0,000006 | 0 ms |
| Início | Mobile | 76 | 100 | 100 | 100 | 4.467 ms | 0 | 3 ms |
| Detalhe | Desktop | 99 | 100 | 100 | 100 | 881 ms | 0 | 0 ms |
| Detalhe | Mobile | 76 | 100 | 100 | 100 | 4.168 ms | 0 | 163 ms |

**Ambiente:** Windows 10 x64, Chrome 155 no host e Lighthouse 12.8.2. O perfil mobile emula Moto G Power (412 × 823, DPR 1,75), com throttling DevTools (CPU 4×, RTT 150 ms); o desktop usa o preset do Lighthouse. Os 12 relatórios HTML e JSON estão em [`reports/lighthouse`](../reports/lighthouse/).

Os problemas de contraste, ordem dos títulos, legibilidade de texto e CLS encontrados durante a auditoria foram corrigidos. A pontuação mobile de Performance (76) e o LCP acima de 4 s continuam sendo oportunidades de otimização; o Lighthouse identifica a imagem LCP da aplicação como não descobrível no documento HTML inicial. A documentação do desafio não define uma nota mínima de aprovação.
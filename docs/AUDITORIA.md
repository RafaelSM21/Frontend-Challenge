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

Os problemas de contraste, ordem dos títulos, legibilidade de texto e CLS encontrados durante a auditoria foram corrigidos.

## Resultado frente às metas

O enunciado (seção 10) define metas de **Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95 e SEO ≥ 90**, e exige justificar o que ficar abaixo.

- **Accessibility, Best Practices e SEO:** atingidas em todas as páginas e perfis (100).
- **Performance desktop:** atingida (99).
- **Performance mobile (76 em Início e Detalhe): abaixo da meta de 90.** O LCP mobile fica entre 4,1 e 4,7 s com o throttling padrão (CPU 4×, RTT 150 ms). O TBT é baixo no Início (3 ms) e chega a 163 ms no Detalhe.

### Causa identificada

Medido nos relatórios mobile (execução 2 de Início e de Detalhe; as demais execuções têm valores próximos): o TTFB é de ≈ 5 ms e o FCP já só ocorre em ≈ 3,6–3,9 s. Na decomposição do LCP, a fase dominante é o **Load Delay (≈ 3,5 s no Início e ≈ 3,7 s no Detalhe)**; o download da imagem (Load Time: 0,3–0,5 s) e o Render Delay (0,06–0,5 s) são pequenos. O Lighthouse marca a imagem LCP como **não descobrível no HTML inicial**.

Em outras palavras, o tempo é gasto antes de a imagem existir no DOM. Pelo código, esse encadeamento é: o `main.tsx` aguarda `startMocks()` (Service Worker do MSW) antes de importar e renderizar a aplicação; depois carregam os chunks de rota; depois a chamada `/api/nfts` é respondida pelo MSW; só então o `<img>` entra no DOM. No desktop esse caminho é curto (LCP ≈ 0,9 s); no mobile, com CPU 4× e RTT 150 ms, ele se estende por vários segundos. A relação entre cada etapa e o atraso é uma dedução a partir do código e dos relatórios — não foi isolada com medições separadas.

### Oportunidades (ainda não aplicadas)

- `<link rel="preload" as="image">` para a imagem LCP do Início (hoje o HTML não a referencia).
- Reduzir o custo de boot do MSW no build de demonstração (o chunk `browser` tem ≈ 330 kB, 108 kB comprimidos, e bloqueia a primeira renderização).
- Dividir o chunk `providers` (≈ 287 kB, 90 kB comprimidos).

Esses itens não foram aplicados para manter a auditoria sem simplificações exclusivas para melhorar a pontuação. Os valores acima não incluem essas otimizações.

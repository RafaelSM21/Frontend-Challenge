import path from 'node:path';
import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

/**
 * Antecipa no HTML o que o boot precisa em seguida. Sem isso, os chunks do MSW e do
 * app só são descobertos depois que o JS de entrada executa (cascata de requisições),
 * e as fontes só depois da primeira renderização (com `font-display: optional` isso
 * faz a primeira visita cair na fonte de fallback).
 *
 * Prioridades: o chunk do app (que dispara a primeira renderização) segue com
 * prioridade normal. O chunk do MSW e as fontes entram com `fetchpriority="low"`:
 * o catálogo só é pedido depois do primeiro render e as fontes só são usadas na
 * pintura, então eles não devem disputar banda com o JS do app em redes lentas.
 *
 * Rotas: o chunk da página (Início e Detalhe) só seria descoberto depois que o app
 * executa. Um script inline escolhe pelo pathname quais chunks pré-carregar, para
 * quem abre a rota direto não esperar mais um salto de rede.
 */
function preloadBootAssets(): Plugin {
  const bootEntry = /src\/(mocks\/browser|app\/providers)\.tsx?$/;
  const mocksEntry = /src\/mocks\/browser\.tsx?$/;
  const bootFonts = /roboto-latin-(400|500|700)-normal-[\w-]+\.woff2$/;
  const routeChunks: { match: string; module: RegExp }[] = [
    { match: '^/$', module: /src\/routes\/index\.tsx(\?|$)/ },
    { match: '^/nfts/[^/]+/?$', module: /src\/routes\/nfts\.\$nftId\.tsx(\?|$)/ },
  ];
  const toPath = (id: string) => id.replace(/\\/g, '/');
  return {
    name: 'kurio-preload-boot-assets',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return undefined;
        const tags: HtmlTagDescriptor[] = [];
        const seen = new Set<string>();

        const visit = (fileName: string, low: boolean) => {
          if (seen.has(fileName)) return;
          seen.add(fileName);
          const chunk = bundle[fileName];
          if (!chunk || chunk.type !== 'chunk') return;
          if (!html.includes(fileName)) {
            tags.push({
              tag: 'link',
              attrs: {
                rel: 'modulepreload',
                crossorigin: '',
                href: `/${fileName}`,
                ...(low ? { fetchpriority: 'low' } : {}),
              },
              injectTo: 'head',
            });
          }
          chunk.imports.forEach((imported) => visit(imported, low));
        };

        const targets: { name: string; mocks: boolean }[] = [];
        for (const output of Object.values(bundle)) {
          if (output.type !== 'chunk' || !output.isEntry) continue;
          for (const fileName of output.dynamicImports) {
            const target = bundle[fileName];
            if (target?.type !== 'chunk') continue;
            // O chunk do app não tem facadeModuleId (módulos mesclados): usa os módulos contidos.
            const ids = target.moduleIds.map(toPath);
            if (!ids.some((id) => bootEntry.test(id))) continue;
            targets.push({ name: fileName, mocks: ids.some((id) => mocksEntry.test(id)) });
          }
        }
        // O app vem primeiro: o que ele compartilha com o MSW herda a prioridade normal.
        targets.sort((a, b) => Number(a.mocks) - Number(b.mocks));
        targets.forEach((t) => visit(t.name, t.mocks));

        for (const output of Object.values(bundle)) {
          if (output.type === 'asset' && bootFonts.test(output.fileName)) {
            tags.push({
              tag: 'link',
              attrs: {
                rel: 'preload',
                as: 'font',
                type: 'font/woff2',
                crossorigin: '',
                href: `/${output.fileName}`,
                fetchpriority: 'low',
              },
              injectTo: 'head',
            });
          }
        }

        // Chunks de rota: o que já foi pré-carregado acima não entra de novo.
        const routes: { m: string; f: string[] }[] = [];
        for (const route of routeChunks) {
          const files = new Set<string>();
          const walk = (name: string) => {
            if (files.has(name) || seen.has(name) || html.includes(name)) return;
            const chunk = bundle[name];
            if (!chunk || chunk.type !== 'chunk') return;
            files.add(name);
            chunk.imports.forEach(walk);
          };
          for (const output of Object.values(bundle)) {
            if (output.type === 'chunk' && output.moduleIds.some((id) => route.module.test(toPath(id)))) {
              walk(output.fileName);
            }
          }
          if (files.size) routes.push({ m: route.match, f: [...files].map((f) => `/${f}`) });
        }
        if (routes.length) {
          tags.push({
            tag: 'script',
            children:
              `(function(){var p=location.pathname,r=${JSON.stringify(routes)};` +
              `for(var i=0;i<r.length;i++){if(new RegExp(r[i].m).test(p)){` +
              `for(var j=0;j<r[i].f.length;j++){var l=document.createElement('link');` +
              `l.rel='modulepreload';l.crossOrigin='';l.href=r[i].f[j];document.head.appendChild(l);}break;}}})();`,
            injectTo: 'head-prepend',
          });
        }
        return tags;
      },
    },
  };
}

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadBootAssets(),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173 },
});
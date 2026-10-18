import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { searchCatalog } from "@/features/catalog/api";
import {
  catalogCategories,
  type CatalogCategory,
  type Network,
} from "@/lib/contracts";
import type { CatalogSearch } from "@/features/catalog/search";
import { catalogSearchSchema } from "@/features/catalog/search";
import {
  FilterPanel,
  FilterToolbar,
} from "@/components/catalog-filters";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  validateSearch: catalogSearchSchema,
  component: HomePage,
});

const networkOptions: { value: Network; label: string }[] = [
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "solana", label: "Solana" },
];

const journalArticles = [
  {
    date: "12 DE SETEMBRO",
    readingTime: "5 MIN",
    title: "Como funciona a propriedade de NFTs",
    summary: "Entenda o token, a obra digital e o que a compra garante.",
    image: "/nfts/NFT%20Artwork%2005.png",
    learnQuery: "NFT sem mistério",
  },
  {
    date: "13 DE SETEMBRO",
    readingTime: "2 MIN",
    title: "Artistas digitais para acompanhar",
    summary: "Conheça criadores que moldam a cultura digital.",
    image: "/nfts/NFT%20Artwork%2003.png",
    creators: true,
  },
  {
    date: "15 DE SETEMBRO",
    readingTime: "3 MIN",
    title: "Raridade, atributos e procedência",
    summary: "Entenda procedência, utilidade e como avaliar uma coleção.",
    image: "/nfts/NFT%20Artwork%2004.png",
    learnQuery: "Como avaliar uma coleção",
  },
  {
    date: "15 DE SETEMBRO",
    readingTime: "2 MIN",
    title: "Como proteger sua carteira",
    summary: "Proteja sua carteira, seus ativos e sua identidade.",
    image: "/nfts/NFT%20Artwork%2010.png",
    learnQuery: "5 sinais de alerta",
  },
];

function HomePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(search.q ?? "");
  const filtersRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMobileSearch(search.q ?? "");
  }, [search.q]);

  const query = useQuery({
    queryKey: ["nfts", search],
    queryFn: async ({ signal }) => searchCatalog(search, signal),
  });

  const updateSearch = (patch: Partial<CatalogSearch>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch, pagina: 1 }),
      resetScroll: false,
    });
  const featuredNft = query.data?.items[6] ?? query.data?.items[0];

  return (
    <div className="site-wrap">
      <form
        className="mobile-discovery-bar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          updateSearch({ q: mobileSearch.trim() || undefined });
        }}
      >
        <label className="sr-only" htmlFor="mobile-catalog-search">
          Buscar obras e criadores
        </label>
        <input
          id="mobile-catalog-search"
          type="search"
          placeholder="Buscar obras e criadores"
          value={mobileSearch}
          onChange={(event) => setMobileSearch(event.target.value)}
        />
        <button
          type="button"
          aria-label="Filtrar obras"
          onClick={() => {
            setMobileFiltersOpen(true);
            filtersRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
        >
          ☷
        </button>
      </form>
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> MARKETPLACE DE ARTE DIGITAL
          </div>
          <h1>
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL.
          </h1>
          <p>
            Descubra, colecione e negocie NFTs únicos criados por artistas
            independentes. Sua próxima peça extraordinária está aqui.
          </p>
          <Button asChild className="button button-primary">
            <a href="#catalogo">
              EXPLORAR COLEÇÃO <span aria-hidden="true">↗</span>
            </a>
          </Button>
          <div className="hero-stats">
            <div>
              <strong>2.4K+</strong>
              <span>ARTISTAS</span>
            </div>
            <div>
              <strong>18K+</strong>
              <span>OBRAS ÚNICAS</span>
            </div>
            <div>
              <strong>7.8K</strong>
              <span>COLECIONADORES</span>
            </div>
          </div>
        </div>
        <div className="hero-art-wrap">
          <div className="hero-art-frame">
            <img
              src="/nfts/NFT%20Artwork%2003.png"
              alt="Arte digital de um macaco colecionável usando óculos e jaqueta verde"
              fetchPriority="high"
            />
          </div>
          <div className="hero-art-label">
            <div>
              <span className="live-dot" /> DESTAQUE DA SEMANA
            </div>
            <strong>Emerald Ape #042</strong>
            <span className="muted">KURIO Genesis</span>
            <div className="hero-price">
              <span>PREÇO ATUAL</span>
              <strong>Ξ 2.45 ETH</strong>
            </div>
          </div>
          <span className="art-index">
            01 <i>/ 04</i>
          </span>
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
        </div>
      </section>

      <section
        className="market-strip container"
        aria-label="Indicadores do marketplace"
      >
        <div>
          <span className="strip-icon">↗</span>
          <span>VOLUME NEGOCIADO</span>
          <strong>1,284.56 ETH</strong>
          <small>+12.8% esta semana</small>
        </div>
        <div>
          <span className="strip-icon">◈</span>
          <span>PREÇO MÉDIO</span>
          <strong>0.84 ETH</strong>
          <small>+4.2% esta semana</small>
        </div>
        <div>
          <span className="strip-icon">◎</span>
          <span>COLEÇÕES ATIVAS</span>
          <strong>126</strong>
          <small>18 novas hoje</small>
        </div>
        <div className="strip-note">
          <span className="live-dot" />{" "}
          <span>
            O MERCADO ESTÁ ATIVO
            <br />
            <b>Novas peças todos os dias.</b>
          </span>
        </div>
      </section>

      <section className="catalog-section container" id="catalogo">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> CURADORIA KURIO
            </div>
            <h2>
              Explore o <em>extraordinário.</em>
            </h2>
            <p>Peças digitais selecionadas para quem enxerga além do comum.</p>
          </div>
          <a className="text-link" href="#catalogo">
            VER TODAS AS OBRAS <span>↗</span>
          </a>
        </div>
        <div className="catalog-layout">
          <FilterPanel
            id="catalog-filters"
            label="Filtros de obras"
            panelRef={filtersRef}
            open={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            groups={[
              {
                id: "categoria",
                heading: "Coleções",
                selected: search.categoria ?? [],
                onChange: (next) =>
                  updateSearch({ categoria: next as CatalogCategory[] }),
                options: catalogCategories.map(({ value, label }) => ({
                  value,
                  label,
                  count:
                    query.data?.facets.categories.find(
                      (category) => category.value === value,
                    )?.count ?? 0,
                })),
              },
              {
                id: "rede",
                heading: "Rede",
                selected: search.rede ?? [],
                onChange: (next) => updateSearch({ rede: next as Network[] }),
                options: networkOptions.map(({ value, label }) => ({
                  value,
                  label,
                  count:
                    query.data?.facets.networks.find(
                      (network) => network.value === value,
                    )?.count ?? 0,
                })),
              },
            ]}
            price={{
              min: search.precoMin,
              max: search.precoMax,
              onApply: ({ min, max }) =>
                updateSearch({ precoMin: min, precoMax: max }),
            }}
            onClearAll={() =>
              updateSearch({
                colecao: [],
                categoria: [],
                rede: [],
                precoMin: undefined,
                precoMax: undefined,
              })
            }
          >
            <article className="featured-nft">
              <div className="featured-nft-heading">
                <span>NFT EM DESTAQUE</span>
                <strong>OFERTA LIMITADA</strong>
              </div>
              <Link
                className="featured-nft-image"
                to="/nfts/$nftId"
                params={{ nftId: featuredNft?.id ?? "nft-001" }}
              >
                <img
                  src={featuredNft?.image ?? "/nfts/NFT%20Artwork%2004.png"}
                  alt={featuredNft?.name ?? "NFT em destaque"}
                />
              </Link>
              <div className="featured-nft-info">
                <Link
                  to="/nfts/$nftId"
                  params={{ nftId: featuredNft?.id ?? "nft-001" }}
                >
                  {featuredNft?.name ?? "Ape #001"}
                </Link>
                <strong>Ξ {featuredNft?.priceEth ?? "0.08"} ETH</strong>
              </div>
            </article>
          </FilterPanel>

          <div className="catalog-main">
            <FilterToolbar
              summary={
                <>
                  <strong>{query.data?.pagination.total ?? "—"}</strong> obras
                  encontradas
                </>
              }
              controlsId="catalog-filters"
              filtersOpen={mobileFiltersOpen}
              onToggleFilters={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              sort={{
                label: "Ordenar obras",
                value: search.ordenar ?? "recentes",
                options: [
                  { value: "recentes", label: "Mais recentes" },
                  { value: "preco-asc", label: "Menor preço" },
                  { value: "preco-desc", label: "Maior preço" },
                ],
                onChange: (value) =>
                  updateSearch({ ordenar: value as CatalogSearch["ordenar"] }),
              }}
            />
            {query.isError && (
              <div className="state-panel">
                <strong>Não foi possível carregar as obras.</strong>
                <p>Verifique a conexão e tente novamente.</p>
                <button
                  className="button button-primary"
                  onClick={() => query.refetch()}
                >
                  TENTAR NOVAMENTE
                </button>
              </div>
            )}
            {query.isPending && (
              <div className="nft-grid">
                {Array.from({ length: 8 }, (_, i) => (
                  <div className="nft-skeleton" key={i}>
                    <div className="skeleton-image" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                  </div>
                ))}
              </div>
            )}
            {query.data && query.data.items.length === 0 && (
              <div className="state-panel">
                <strong>Nenhuma obra encontrada.</strong>
                <p>Tente mudar a busca ou remover alguns filtros.</p>
                <button
                  className="button button-outline"
                  onClick={() => {
                    updateSearch({
                      q: undefined,
                      colecao: [],
                      categoria: [],
                      rede: [],
                      precoMin: undefined,
                      precoMax: undefined,
                    });
                  }}
                >
                  LIMPAR FILTROS
                </button>
              </div>
            )}
            {query.data && query.data.items.length > 0 && (
              <div className="nft-grid">
                {query.data.items.map((nft, index) => (
                  <article className="nft-card" key={nft.id}>
                    <Link
                      to="/nfts/$nftId"
                      params={{ nftId: nft.id }}
                      className="nft-image-link"
                    >
                      <img
                        src={nft.image}
                        alt={`Arte da obra ${nft.name}`}
                        loading={index > 3 ? "lazy" : "eager"}
                      />
                      <span className="nft-edition">
                        EDIÇÃO #{String(index + 1).padStart(3, "0")}
                      </span>
                      <button
                        className="favorite-button"
                        aria-label={`Favoritar ${nft.name}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.alert(
                            "Faça login para salvar seus favoritos.",
                          );
                        }}
                      >
                        ♡
                      </button>
                    </Link>
                    <div className="nft-info">
                      <div className="nft-collection">{nft.collection}</div>
                      <Link
                        to="/nfts/$nftId"
                        params={{ nftId: nft.id }}
                        className="nft-name"
                      >
                        {nft.name}
                      </Link>
                      <div className="nft-card-bottom">
                        <div>
                          <span>PREÇO ATUAL</span>
                          <strong>Ξ {nft.priceEth} ETH</strong>
                        </div>
                        <span className={`network-badge ${nft.network}`}>
                          {nft.network === "ethereum"
                            ? "ETH"
                            : nft.network === "polygon"
                              ? "POL"
                              : "SOL"}
                        </span>
                      </div>
                      <Link
                        to="/nfts/$nftId"
                        params={{ nftId: nft.id }}
                        className="card-action"
                      >
                        VER DETALHES <span>↗</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {query.data && query.data.pagination.pages > 1 && (
              <nav className="pagination" aria-label="Paginação do catálogo">
                <button
                  disabled={(search.pagina ?? 1) <= 1}
                  onClick={() =>
                    navigate({
                      search: (p) => ({
                        ...p,
                        pagina: Math.max(1, (p.pagina ?? 1) - 1),
                      }),
                    })
                  }
                >
                  ← ANTERIOR
                </button>
                <span>
                  PÁGINA <b>{search.pagina ?? 1}</b> DE{" "}
                  {query.data.pagination.pages}
                </span>
                <button
                  disabled={(search.pagina ?? 1) >= query.data.pagination.pages}
                  onClick={() =>
                    navigate({
                      search: (p) => ({ ...p, pagina: (p.pagina ?? 1) + 1 }),
                    })
                  }
                >
                  PRÓXIMA →
                </button>
              </nav>
            )}
          </div>
        </div>
      </section>

      <section
        className="home-promos container"
        id="criadores"
        aria-label="Coleções em destaque"
      >
        <article className="home-promo">
          <img
            src="/nfts/NFT%20Artwork%2003.png"
            alt="Arte digital de um macaco"
          />
          <div>
            <h2>Lançamentos gênesis de edição limitada</h2>
            <p>Colecione edições escassas diretamente dos criadores.</p>
            <Link to="/mercado">
              Explorar <span>↗</span>
            </Link>
          </div>
        </article>
        <article className="home-promo">
          <img
            src="/nfts/NFT%20Artwork%2005.png"
            alt="Arte digital de um colecionável em tons escuros"
          />
          <div>
            <h2>Arte digital selecionada e muito mais</h2>
            <p>
              Explore novos artistas, coleções verificadas e obras digitais.
            </p>
            <Link to="/mercado">
              Explorar <span>↗</span>
            </Link>
          </div>
        </article>
      </section>

      <section className="mint-journal container" id="aprenda">
        <header className="mint-journal-heading">
          <h2>Diário da Cunhagem</h2>
          <p>
            Histórias, guias e ideias para colecionadores no universo da
            propriedade digital.
          </p>
        </header>
        <div className="mint-journal-grid">
          {journalArticles.map((article) => (
            <Link
              className="journal-card journal-card-link"
              key={article.title}
              to={article.creators ? "/criadores" : "/aprenda"}
              hash={article.creators ? undefined : "biblioteca"}
              search={article.creators ? undefined : { assunto: article.learnQuery }}
              aria-label={`${article.title}: abrir conteúdo`}
            >
              <img src={article.image} alt="" loading="lazy" />
              <div className="journal-card-content">
                <span>
                  {article.date} <i>|</i> Leitura de {article.readingTime}
                </span>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

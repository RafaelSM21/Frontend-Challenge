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
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  validateSearch: catalogSearchSchema,
  component: HomePage,
});

const journalArticles = [
  {
    date: "12 DE SETEMBRO",
    readingTime: "6 MIN",
    title: "Como funciona a propriedade de NFTs",
    summary: "Aprenda a colecionar, negociar e verificar ativos digitais.",
    image: "/nfts/NFT%20Artwork%2005.png",
  },
  {
    date: "13 DE SETEMBRO",
    readingTime: "2 MIN",
    title: "Artistas digitais para acompanhar",
    summary: "Conheça criadores que moldam a cultura digital.",
    image: "/nfts/NFT%20Artwork%2003.png",
  },
  {
    date: "15 DE SETEMBRO",
    readingTime: "3 MIN",
    title: "Raridade, atributos e procedência",
    summary: "Entenda raridade, procedência, direitos autorais e utilidade.",
    image: "/nfts/NFT%20Artwork%2004.png",
  },
  {
    date: "15 DE SETEMBRO",
    readingTime: "2 MIN",
    title: "Como proteger sua carteira",
    summary: "Proteja sua carteira, seus ativos e sua identidade.",
    image: "/nfts/NFT%20Artwork%2010.png",
  },
];

function HomePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(search.q ?? "");
  const [minPrice, setMinPrice] = useState(search.precoMin ?? "");
  const [maxPrice, setMaxPrice] = useState(search.precoMax ?? "");
  const filtersRef = useRef<HTMLElement>(null);
  const filtersInitialFocusRef = useRef<HTMLButtonElement>(null);
  useDialogFocus(mobileFiltersOpen, filtersRef, filtersInitialFocusRef, () =>
    setMobileFiltersOpen(false),
  );

  useEffect(() => {
    setMinPrice(search.precoMin ?? "");
    setMaxPrice(search.precoMax ?? "");
  }, [search.precoMin, search.precoMax]);

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
  const toggleValue = (
    list: string[],
    value: string,
    setter: (next: string[]) => void,
  ) =>
    setter(
      list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value],
    );
  const minimumPriceValue = Math.max(
    0.02,
    Math.min(Number(minPrice || "0.02"), 12.3),
  );
  const maximumPriceValue = Math.max(
    minimumPriceValue,
    Math.min(Number(maxPrice || "12.30"), 12.3),
  );
  const priceRangeStart = ((minimumPriceValue - 0.02) / 12.28) * 100;
  const priceRangeEnd = ((maximumPriceValue - 0.02) / 12.28) * 100;
  const catalogItems = Array.isArray(query.data?.items)
    ? query.data.items
    : [];

  const featuredNft = catalogItems[6] ?? catalogItems[0];

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
          <aside
            id="catalog-filters"
            ref={filtersRef}
            className={`filters ${mobileFiltersOpen ? "filters-open" : ""}`}
            role={mobileFiltersOpen ? "dialog" : undefined}
            aria-modal={mobileFiltersOpen || undefined}
            aria-label={mobileFiltersOpen ? "Filtros de obras" : undefined}
          >
            <h2 className="filters-heading">Filtros</h2>
            <div className="filter-group">
              <h3 className="filter-group-heading">
                <span>Coleções</span>
                <button
                  ref={filtersInitialFocusRef}
                  className="clear-button"
                  onClick={() => {
                    setMinPrice("");
                    setMaxPrice("");
                    updateSearch({
                      colecao: [],
                      categoria: [],
                      rede: [],
                      precoMin: undefined,
                      precoMax: undefined,
                    });
                  }}
                >
                  Limpar tudo
                </button>
              </h3>
              {catalogCategories.map(({ value, label }) => (
                <label className="filter-option" key={value}>
                  <input
                    type="checkbox"
                    checked={(search.categoria ?? []).includes(value)}
                    onChange={() =>
                      toggleValue(search.categoria ?? [], value, (next) =>
                        updateSearch({ categoria: next as CatalogCategory[] }),
                      )
                    }
                  />
                  <span>{label}</span>
                  <small>
                    {query.data?.facets.categories.find(
                      (category) => category.value === value,
                    )?.count ?? 0}
                  </small>
                </label>
              ))}
            </div>
            <div className="filter-group">
              <h3>Rede</h3>
              {(
                [
                  { value: "ethereum", label: "Ethereum" },
                  { value: "polygon", label: "Polygon" },
                  { value: "solana", label: "Solana" },
                ] as { value: Network; label: string }[]
              ).map(({ value, label }) => (
                <label className="filter-option" key={value}>
                  <input
                    type="checkbox"
                    checked={(search.rede ?? []).includes(value)}
                    onChange={() =>
                      toggleValue(search.rede ?? [], value, (next) =>
                        updateSearch({ rede: next as Network[] }),
                      )
                    }
                  />
                  <span>{label}</span>
                  <small>
                    {query.data?.facets.networks.find(
                      (network) => network.value === value,
                    )?.count ?? 0}
                  </small>
                </label>
              ))}
            </div>
            <div className="filter-group">
              <h3>Faixa de preço</h3>
              <div className="price-slider">
                <div className="price-slider-track">
                  <span
                    className="price-slider-fill"
                    style={{
                      left: `${priceRangeStart}%`,
                      right: `${100 - priceRangeEnd}%`,
                    }}
                  />
                </div>
                <input
                  aria-label="Preço mínimo em ETH"
                  className="price-slider-min"
                  type="range"
                  min="0.02"
                  max={maximumPriceValue}
                  step="0.01"
                  value={minimumPriceValue}
                  onChange={(event) =>
                    setMinPrice(Number(event.target.value).toFixed(2))
                  }
                />
                <input
                  aria-label="Preço máximo em ETH"
                  className="price-slider-max"
                  type="range"
                  min={minimumPriceValue}
                  max="12.3"
                  step="0.01"
                  value={maximumPriceValue}
                  onChange={(event) =>
                    setMaxPrice(Number(event.target.value).toFixed(2))
                  }
                />
              </div>
              <p className="price-summary">
                Preço: {minimumPriceValue.toFixed(2).replace(".", ",")} -{" "}
                {maximumPriceValue.toFixed(2).replace(".", ",")} ETH
              </p>
              <button
                className="button button-outline apply-price"
                onClick={() =>
                  updateSearch({
                    precoMin: minPrice || undefined,
                    precoMax: maxPrice || undefined,
                  })
                }
              >
                Aplicar
              </button>
            </div>
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
          </aside>

          <div className="catalog-main">
            <div className="catalog-toolbar">
              <div className="result-count">
                <strong>{query.data?.pagination.total ?? "—"}</strong> obras
                encontradas
              </div>
              <div className="toolbar-actions">
                <button
                  className="mobile-filter-button"
                  aria-expanded={mobileFiltersOpen}
                  aria-controls="catalog-filters"
                  onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                >
                  ☷ FILTROS
                </button>
                <label className="sort-control">
                  <span>ORDENAR POR</span>
                  <select
                    aria-label="Ordenar obras"
                    value={search.ordenar ?? "recentes"}
                    onChange={(e) =>
                      updateSearch({
                        ordenar: e.target.value as CatalogSearch["ordenar"],
                      })
                    }
                  >
                    <option value="recentes">Mais recentes</option>
                    <option value="preco-asc">Menor preço</option>
                    <option value="preco-desc">Maior preço</option>
                  </select>
                </label>
              </div>
            </div>
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
            <a href="#catalogo">
              Explorar <span>↗</span>
            </a>
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
            <a href="#catalogo">
              Explorar <span>↗</span>
            </a>
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
            <article className="journal-card" key={article.title}>
              <img src={article.image} alt="" loading="lazy" />
              <div className="journal-card-content">
                <span>
                  {article.date} <i>|</i> Leitura de {article.readingTime}
                </span>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

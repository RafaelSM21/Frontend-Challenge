import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CreatorAvatar } from "@/components/creator-avatar";
import {
  getMarketCreators,
  type MarketCreator,
} from "@/features/catalog/api";
import { catalogCategories } from "@/lib/contracts";
import type { CatalogCategory, Network } from "@/lib/contracts";
import {
  FilterPanel,
  FilterToolbar,
} from "@/components/catalog-filters";
import {
  creatorsSearchSchema,
  type CreatorsSearch,
} from "@/features/market/search";

export const Route = createFileRoute("/criadores/")({
  validateSearch: creatorsSearchSchema,
  component: CreatorsPage,
});

const EMPTY_CREATORS: MarketCreator[] = [];
const networks: Array<{ value: Network; label: string }> = [
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "solana", label: "Solana" },
];

const NONE: never[] = [];

function countBy<T>(items: T[], pick: (item: T) => string[]) {
  const counts = new Map<string, number>();
  for (const item of items)
    for (const value of new Set(pick(item)))
      counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function CreatorsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/criadores/" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLElement>(null);
  const creatorsQuery = useQuery({
    queryKey: ["market-creators"],
    queryFn: ({ signal }) => getMarketCreators(signal),
  });
  const creators = creatorsQuery.data ?? EMPTY_CREATORS;
  const updateSearch = (patch: Partial<CreatorsSearch>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      resetScroll: false,
    });
  const collections = useMemo(
    () =>
      Array.from(
        new Set(creators.flatMap((creator) => creator.collections)),
      ).sort((first, second) => first.localeCompare(second)),
    [creators],
  );
  const counts = useMemo(
    () => ({
      categories: countBy(creators, (item) => item.categories),
      networks: countBy(creators, (item) => item.networks),
      collections: countBy(creators, (item) => item.collections),
    }),
    [creators],
  );
  const sortBy = search.ordenar ?? "recentes";
  const selectedCategories = search.categoria ?? NONE;
  const selectedNetworks = search.rede ?? NONE;
  const selectedCollections = search.colecao ?? NONE;
  const visibleCreators = useMemo(() => {
    const normalizedSearch = (search.q ?? "").toLocaleLowerCase();
    const filtered = creators.filter((creator) => {
      const matchesSearch = creator.name
        .toLocaleLowerCase()
        .includes(normalizedSearch);
      return (
        matchesSearch &&
        (selectedCategories.length === 0 ||
          creator.categories.some((value) =>
            selectedCategories.includes(value),
          )) &&
        (selectedNetworks.length === 0 ||
          creator.networks.some((value) => selectedNetworks.includes(value))) &&
        (selectedCollections.length === 0 ||
          creator.collections.some((value) =>
            selectedCollections.includes(value),
          ))
      );
    });
    filtered.sort((first, second) => {
      if (sortBy === "obras") return second.nftCount - first.nftCount;
      if (sortBy === "recentes")
        return second.newestAt.localeCompare(first.newestAt);
      return first.name.localeCompare(second.name);
    });
    return filtered;
  }, [
    creators,
    sortBy,
    search.q,
    selectedCategories,
    selectedCollections,
    selectedNetworks,
  ]);
  const clearFilters = () =>
    updateSearch({
      q: undefined,
      categoria: undefined,
      rede: undefined,
      colecao: undefined,
    });

  return (
    <div className="creators-page">
      <section className="creators-intro container">
        <div className="eyebrow">
          <span className="eyebrow-line" /> PESSOAS POR TRÁS DAS OBRAS
        </div>
        <h1>
          Conheça os <em>criadores.</em>
        </h1>
        <p>
          Descubra os artistas e estúdios presentes nas coleções do Kurio e
          explore as obras que eles criaram.
        </p>
      </section>

      <section
        className="creators-directory container"
        aria-labelledby="creators-directory-title"
      >
        <div className="creators-section-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> COMUNIDADE KURIO
            </div>
            <h2 id="creators-directory-title">Criadores para descobrir</h2>
          </div>
          {creatorsQuery.data && (
            <span className="creators-count">
              {creators.length} criadores
            </span>
          )}
        </div>

        <div className="catalog-layout">
          {creatorsQuery.data && (
            <FilterPanel
              id="creators-filters"
              label="Filtros de criadores"
              panelRef={filtersRef}
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              search={{
                id: "creators-search",
                label: "Buscar criador",
                placeholder: "Nome do artista ou estúdio...",
                value: search.q ?? "",
                onChange: (value) => updateSearch({ q: value || undefined }),
              }}
              groups={[
                {
                  id: "categoria",
                  heading: "Categoria das obras",
                  selected: selectedCategories,
                  onChange: (next) =>
                    updateSearch({
                      categoria: next.length
                        ? (next as CatalogCategory[])
                        : undefined,
                    }),
                  options: catalogCategories.map(({ value, label }) => ({
                    value,
                    label,
                    count: counts.categories.get(value) ?? 0,
                  })),
                },
                {
                  id: "rede",
                  heading: "Rede blockchain",
                  selected: selectedNetworks,
                  onChange: (next) =>
                    updateSearch({
                      rede: next.length ? (next as Network[]) : undefined,
                    }),
                  options: networks.map(({ value, label }) => ({
                    value,
                    label,
                    count: counts.networks.get(value) ?? 0,
                  })),
                },
                {
                  id: "colecao",
                  heading: "Coleção",
                  selected: selectedCollections,
                  onChange: (next) =>
                    updateSearch({ colecao: next.length ? next : undefined }),
                  options: collections.map((name) => ({
                    value: name,
                    label: name,
                    count: counts.collections.get(name) ?? 0,
                  })),
                },
              ]}
              onClearAll={clearFilters}
            />
          )}

          <div className="catalog-main creators-results">
            {creatorsQuery.data && (
              <FilterToolbar
                summary={
                  <>
                    <strong>{visibleCreators.length}</strong>{" "}
                    {visibleCreators.length === 1
                      ? "criador encontrado"
                      : "criadores encontrados"}
                  </>
                }
                controlsId="creators-filters"
                filtersOpen={filtersOpen}
                onToggleFilters={() => setFiltersOpen(!filtersOpen)}
                sort={{
                  label: "Ordenar criadores",
                  value: sortBy,
                  options: [
                    { value: "recentes", label: "Mais recentes" },
                    { value: "obras", label: "Mais obras" },
                    { value: "nome", label: "Nome (A-Z)" },
                  ],
                  onChange: (value) =>
                    updateSearch({
                      ordenar: value as CreatorsSearch["ordenar"],
                    }),
                }}
              />
            )}
        {creatorsQuery.isPending && <CreatorLoadingState />}
        {creatorsQuery.isError && (
          <div className="creators-state" role="alert">
            <h3>Não foi possível carregar os criadores.</h3>
            <p>Tente novamente para carregar o diretório.</p>
            <button
              className="button button-outline"
              type="button"
              onClick={() => void creatorsQuery.refetch()}
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        )}
        {creatorsQuery.isSuccess && visibleCreators.length === 0 && (
          <div className="creators-state" role="status">
            <h3>Nenhum criador encontrado.</h3>
            <p>Experimente outra busca ou categoria.</p>
            <button
              className="button button-outline"
              type="button"
              onClick={clearFilters}
            >
              LIMPAR FILTROS
            </button>
          </div>
        )}
        {creatorsQuery.isSuccess && visibleCreators.length > 0 && (
          <>
            <div className="creator-grid">
              {visibleCreators.map((creator) => (
                <CreatorCard key={creator.name} creator={creator} />
              ))}
            </div>
          </>
        )}
          </div>
        </div>
      </section>
    </div>
  );
}

function CreatorCard({ creator }: { creator: MarketCreator }) {
  return (
    <Link
      className="creator-card"
      to="/criadores/$creatorName"
      params={{ creatorName: creator.name }}
      aria-label={`Ver criador ${creator.name}, ${creator.nftCount} obras em ${creator.collections.length} coleções`}
    >
      <div className="creator-card-art">
        <CreatorAvatar name={creator.name} avatar={creator.avatar} />
        <span className="creator-card-art-count">
          <span aria-hidden="true">✦</span>
          {creator.nftCount} obras
        </span>
      </div>
      <div className="creator-card-content">
        <span className="creator-card-role">CRIADOR KURIO</span>
        <h3>{creator.name}</h3>
        <p>
          {creator.collections.length}{" "}
          {creator.collections.length === 1 ? "coleção" : "coleções"} ·{" "}
          {creator.categories
            .map(
              (category) =>
                catalogCategories.find((item) => item.value === category)
                  ?.label ?? category,
            )
            .slice(0, 2)
            .join(" · ")}
        </p>
        <div className="creator-card-footer">
          <span>Explorar obras</span>
          <ArrowUpRight aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

function CreatorLoadingState() {
  return (
    <div className="creator-grid" aria-label="Carregando criadores">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="creator-skeleton" key={index} aria-hidden="true">
          <div className="creator-skeleton-art" />
          <div className="creator-skeleton-line" />
          <div className="creator-skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

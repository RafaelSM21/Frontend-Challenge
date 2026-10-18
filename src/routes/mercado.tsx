import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  getMarketCollections,
  type MarketCollection,
} from "@/features/catalog/api";
import { catalogCategories } from "@/lib/contracts";
import type { CatalogCategory, Network } from "@/lib/contracts";
import {
  FilterPanel,
  FilterToolbar,
} from "@/components/catalog-filters";
import { marketSearchSchema, type MarketSearch } from "@/features/market/search";

export const Route = createFileRoute("/mercado")({
  validateSearch: marketSearchSchema,
  component: MarketPage,
});

const networks: Array<{ value: Network; label: string }> = [
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "solana", label: "Solana" },
];
const EMPTY_COLLECTIONS: MarketCollection[] = [];

const NONE: never[] = [];

function countBy<T>(items: T[], pick: (item: T) => string[]) {
  const counts = new Map<string, number>();
  for (const item of items)
    for (const value of new Set(pick(item)))
      counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function MarketPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/mercado" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLElement>(null);
  const collectionsQuery = useQuery({
    queryKey: ["market-collections"],
    queryFn: ({ signal }) => getMarketCollections(signal),
  });
  const collections = collectionsQuery.data ?? EMPTY_COLLECTIONS;
  const updateSearch = (patch: Partial<MarketSearch>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      resetScroll: false,
    });
  const creators = useMemo(
    () =>
      Array.from(
        new Set(collections.flatMap((collection) => collection.creators)),
      ).sort(),
    [collections],
  );
  const counts = useMemo(
    () => ({
      categories: countBy(collections, (item) => item.categories),
      networks: countBy(collections, (item) => item.networks),
      creators: countBy(collections, (item) => item.creators),
    }),
    [collections],
  );
  const sortBy = search.ordenar ?? "recentes";
  const selectedCategories = search.categoria ?? NONE;
  const selectedNetworks = search.rede ?? NONE;
  const selectedCreators = search.criador ?? NONE;
  const visibleCollections = useMemo(() => {
    const normalizedSearch = (search.q ?? "").toLocaleLowerCase();
    const filtered = collections.filter((collection) => {
      const matchesSearch =
        !normalizedSearch ||
        `${collection.name} ${collection.creators.join(" ")}`
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      return (
        matchesSearch &&
        (selectedCategories.length === 0 ||
          collection.categories.some((value) =>
            selectedCategories.includes(value),
          )) &&
        (selectedNetworks.length === 0 ||
          collection.networks.some((value) =>
            selectedNetworks.includes(value),
          )) &&
        (selectedCreators.length === 0 ||
          collection.creators.some((value) =>
            selectedCreators.includes(value),
          ))
      );
    });

    if (sortBy === "nome") {
      filtered.sort((first, second) => first.name.localeCompare(second.name));
    } else if (sortBy === "quantidade") {
      filtered.sort((first, second) => second.nftCount - first.nftCount);
    } else {
      filtered.sort(
        (first, second) =>
          second.newestAt.localeCompare(first.newestAt) ||
          first.name.localeCompare(second.name),
      );
    }
    return filtered;
  }, [
    collections,
    sortBy,
    search.q,
    selectedCategories,
    selectedCreators,
    selectedNetworks,
  ]);
  const clearFilters = () =>
    updateSearch({
      q: undefined,
      categoria: undefined,
      rede: undefined,
      criador: undefined,
    });

  return (
    <div className="market-page">
      <section className="market-intro container">
        <div className="eyebrow">
          <span className="eyebrow-line" /> CURADORIA KURIO
        </div>
        <h1>
          Explore o universo <em>digital.</em>
        </h1>
        <p>
          Descubra coleções, conheça seus criadores e encontre a próxima obra
          para sua coleção.
        </p>
      </section>

      <section
        className="market-collections container"
        aria-labelledby="market-collections-title"
      >
        <div className="market-section-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> DESCUBRA ALGO NOVO
            </div>
            <h2 id="market-collections-title">Coleções para explorar</h2>
          </div>
          {collectionsQuery.data && (
            <span className="market-collection-count">
              {collections.length} coleções
            </span>
          )}
        </div>

        <div className="catalog-layout">
          {collectionsQuery.data && (
            <FilterPanel
              id="market-filters"
              label="Filtros de coleções"
              panelRef={filtersRef}
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              search={{
                id: "market-search",
                label: "Buscar coleções ou criadores",
                placeholder: "Nome da coleção ou do criador...",
                value: search.q ?? "",
                onChange: (value) => updateSearch({ q: value || undefined }),
              }}
              groups={[
                {
                  id: "categoria",
                  heading: "Categorias",
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
                  heading: "Rede",
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
                  id: "criador",
                  heading: "Criador",
                  selected: selectedCreators,
                  onChange: (next) =>
                    updateSearch({ criador: next.length ? next : undefined }),
                  options: creators.map((name) => ({
                    value: name,
                    label: name,
                    count: counts.creators.get(name) ?? 0,
                  })),
                },
              ]}
              onClearAll={clearFilters}
            />
          )}

          <div className="catalog-main market-collection-results">
            {collectionsQuery.data && (
              <FilterToolbar
                summary={
                  <>
                    <strong>{visibleCollections.length}</strong>{" "}
                    {visibleCollections.length === 1
                      ? "coleção encontrada"
                      : "coleções encontradas"}
                  </>
                }
                controlsId="market-filters"
                filtersOpen={filtersOpen}
                onToggleFilters={() => setFiltersOpen(!filtersOpen)}
                sort={{
                  label: "Ordenar coleções",
                  value: sortBy,
                  options: [
                    { value: "recentes", label: "Mais recentes" },
                    { value: "quantidade", label: "Mais NFTs" },
                    { value: "nome", label: "Nome (A–Z)" },
                  ],
                  onChange: (value) =>
                    updateSearch({ ordenar: value as MarketSearch["ordenar"] }),
                }}
              />
            )}
        {collectionsQuery.isPending && <CollectionLoadingState />}
        {collectionsQuery.isError && (
          <div className="market-state" role="alert">
            <h3>Não foi possível carregar as coleções.</h3>
            <p>
              Tente novamente. As coleções são montadas a partir das obras
              disponíveis.
            </p>
            <button
              className="button button-outline"
              type="button"
              onClick={() => void collectionsQuery.refetch()}
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        )}
        {collectionsQuery.isSuccess && visibleCollections.length === 0 && (
          <div className="market-state" role="status">
            <h3>Nenhuma coleção encontrada.</h3>
            <p>Experimente ajustar a busca ou os filtros selecionados.</p>
            <button
              className="button button-outline"
              type="button"
              onClick={clearFilters}
            >
              LIMPAR FILTROS
            </button>
          </div>
        )}
        {collectionsQuery.isSuccess && visibleCollections.length > 0 && (
          <>
            <div className="collection-grid">
              {visibleCollections.map((collection) => (
                <CollectionCard
                  key={collection.name}
                  collection={collection}
                />
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

function CollectionCard({ collection }: { collection: MarketCollection }) {
  const categoryLabels = collection.categories.map(
    (category) =>
      catalogCategories.find((item) => item.value === category)?.label ??
      category,
  );
  const creatorLabel =
    collection.creators.length === 1
      ? `por ${collection.creators[0]}`
      : `${collection.creators.length} criadores`;
  const description =
    categoryLabels.length === 1 && categoryLabels[0]
      ? `Obras de ${categoryLabels[0].toLocaleLowerCase()} selecionadas para explorar.`
      : categoryLabels.length > 1
        ? `${categoryLabels.length} estilos artísticos em uma coleção para explorar.`
        : "Obras digitais desta coleção para explorar.";

  return (
    <Link
      className="collection-card"
      to="/colecoes/$collectionName"
      params={{ collectionName: collection.name }}
      aria-label={`Explorar coleção ${collection.name}, ${collection.nftCount} NFTs, ${creatorLabel}`}
    >
      <div
        className="collection-card-art"
        data-image-count={collection.images.length}
        aria-hidden="true"
      >
        {collection.images.slice(0, 4).map((image, index) => (
          <img
            key={image}
            src={image}
            alt=""
            className={`collection-card-image collection-card-image-${index + 1}`}
            loading="lazy"
          />
        ))}
        <span className="collection-card-art-count">
          <Layers3 aria-hidden="true" />
          {collection.nftCount} NFTs
        </span>
      </div>
      <div className="collection-card-content">
        <span className="collection-card-category">
          {categoryLabels.slice(0, 2).join(" · ")}
        </span>
        <h3>{collection.name}</h3>
        <p className="collection-card-creator">{creatorLabel}</p>
        <p className="collection-card-description">{description}</p>
        <div className="collection-card-footer">
          <span>Explorar coleção</span>
          <ArrowUpRight aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

function CollectionLoadingState() {
  return (
    <div className="collection-grid" aria-label="Carregando coleções">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="collection-skeleton" key={index} aria-hidden="true">
          <div className="collection-skeleton-art" />
          <div className="collection-skeleton-line" />
          <div className="collection-skeleton-line short" />
          <div className="collection-skeleton-line" />
        </div>
      ))}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Layers3, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getMarketCollections,
  type MarketCollection,
} from "@/features/catalog/api";
import { catalogCategories } from "@/lib/contracts";
import type { Network } from "@/lib/contracts";

export const Route = createFileRoute("/mercado")({
  component: MarketPage,
});

const networks: Array<{ value: Network; label: string }> = [
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "solana", label: "Solana" },
];
const EMPTY_COLLECTIONS: MarketCollection[] = [];

function MarketPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [network, setNetwork] = useState("");
  const [creator, setCreator] = useState("");
  const [sort, setSort] = useState("recentes");
  const collectionsQuery = useQuery({
    queryKey: ["market-collections"],
    queryFn: ({ signal }) => getMarketCollections(signal),
  });
  const collections = collectionsQuery.data ?? EMPTY_COLLECTIONS;
  const creators = useMemo(
    () =>
      Array.from(
        new Set(collections.flatMap((collection) => collection.creators)),
      ).sort(),
    [collections],
  );
  const visibleCollections = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filtered = collections.filter((collection) => {
      const matchesSearch =
        !normalizedSearch ||
        `${collection.name} ${collection.creators.join(" ")}`
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      return (
        matchesSearch &&
        (!category || collection.categories.some((value) => value === category)) &&
        (!network || collection.networks.some((value) => value === network)) &&
        (!creator || collection.creators.includes(creator))
      );
    });

    if (sort === "nome") {
      filtered.sort((first, second) => first.name.localeCompare(second.name));
    } else if (sort === "quantidade") {
      filtered.sort((first, second) => second.nftCount - first.nftCount);
    } else {
      filtered.sort(
        (first, second) =>
          second.newestAt.localeCompare(first.newestAt) ||
          first.name.localeCompare(second.name),
      );
    }
    return filtered;
  }, [category, collections, creator, network, search, sort]);

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

        {collectionsQuery.data && (
          <div className="market-filters" aria-label="Filtros de coleções">
            <label className="market-filter market-search">
              <span>Buscar</span>
              <span className="market-search-control">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Buscar coleções ou criadores"
                  placeholder="Coleções ou criadores..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </span>
            </label>
            <label className="market-filter">
              <span>Categoria</span>
              <select
                aria-label="Filtrar por categoria"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Todas as categorias</option>
                {catalogCategories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="market-filter">
              <span>Rede</span>
              <select
                aria-label="Filtrar por rede"
                value={network}
                onChange={(event) => setNetwork(event.target.value)}
              >
                <option value="">Todas as redes</option>
                {networks.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="market-filter">
              <span>Criador</span>
              <select
                aria-label="Filtrar por criador"
                value={creator}
                onChange={(event) => setCreator(event.target.value)}
              >
                <option value="">Todos os criadores</option>
                {creators.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="market-filter market-sort">
              <span>Ordenar</span>
              <select
                aria-label="Ordenar coleções"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="recentes">Mais recentes</option>
                <option value="quantidade">Mais NFTs</option>
                <option value="nome">Nome (A–Z)</option>
              </select>
            </label>
          </div>
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
              onClick={() => {
                setSearch("");
                setCategory("");
                setNetwork("");
                setCreator("");
              }}
            >
              LIMPAR FILTROS
            </button>
          </div>
        )}
        {collectionsQuery.isSuccess && visibleCollections.length > 0 && (
          <>
            <p className="market-result-count" role="status">
              {visibleCollections.length}{" "}
              {visibleCollections.length === 1
                ? "coleção encontrada"
                : "coleções encontradas"}
            </p>
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

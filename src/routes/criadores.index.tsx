import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CreatorAvatar } from "@/components/creator-avatar";
import {
  getMarketCreators,
  type MarketCreator,
} from "@/features/catalog/api";
import { catalogCategories } from "@/lib/contracts";

export const Route = createFileRoute("/criadores/")({
  component: CreatorsPage,
});

const EMPTY_CREATORS: MarketCreator[] = [];

function CreatorsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [network, setNetwork] = useState("");
  const [collection, setCollection] = useState("");
  const [sort, setSort] = useState("recentes");
  const creatorsQuery = useQuery({
    queryKey: ["market-creators"],
    queryFn: ({ signal }) => getMarketCreators(signal),
  });
const creators = creatorsQuery.data ?? EMPTY_CREATORS;
  const collections = useMemo(
    () =>
      Array.from(
        new Set(creators.flatMap((creator) => creator.collections)),
      ).sort((first, second) => first.localeCompare(second)),
    [creators],
  );
  const visibleCreators = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filtered = creators.filter((creator) => {
      const matchesSearch = creator.name
        .toLocaleLowerCase()
        .includes(normalizedSearch);
      return (
        matchesSearch &&
        (!category ||
          creator.categories.some((value) => value === category)) &&
        (!network || creator.networks.some((value) => value === network)) &&
        (!collection || creator.collections.includes(collection))
      );
    });
    filtered.sort((first, second) => {
      if (sort === "obras") return second.nftCount - first.nftCount;
      if (sort === "recentes")
        return second.newestAt.localeCompare(first.newestAt);
      return first.name.localeCompare(second.name);
    });
    return filtered;
  }, [category, collection, creators, network, search, sort]);

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

        {creatorsQuery.data && (
          <div className="creators-filters">
            <label className="creators-filter">
              <span>Buscar criador</span>
              <input
                type="search"
                aria-label="Buscar criador"
                placeholder="Nome do artista ou estúdio..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="creators-filter">
              <span>Categoria das obras</span>
              <select
                aria-label="Filtrar criadores por categoria"
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
            <label className="creators-filter">
              <span>Rede blockchain</span>
              <select
                aria-label="Filtrar criadores por rede blockchain"
                value={network}
                onChange={(event) => setNetwork(event.target.value)}
              >
                <option value="">Todas as redes</option>
                <option value="ethereum">Ethereum</option>
                <option value="polygon">Polygon</option>
                <option value="solana">Solana</option>
              </select>
            </label>
            <label className="creators-filter">
              <span>Coleção</span>
              <select
                aria-label="Filtrar criadores por coleção"
                value={collection}
                onChange={(event) => setCollection(event.target.value)}
              >
                <option value="">Todas as coleções</option>
                {collections.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="creators-filter">
              <span>Ordenar por</span>
              <select
                aria-label="Ordenar criadores"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="recentes">Mais recentes</option>
                <option value="obras">Mais obras</option>
                <option value="nome">Nome (A-Z)</option>
              </select>
            </label>
          </div>
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
              onClick={() => {
                setSearch("");
                setCategory("");
                setNetwork("");
                setCollection("");
                setSort("recentes");
              }}
            >
              LIMPAR FILTROS
            </button>
          </div>
        )}
        {creatorsQuery.isSuccess && visibleCreators.length > 0 && (
          <>
            <p className="creators-result-count" role="status">
              {visibleCreators.length}{" "}
              {visibleCreators.length === 1
                ? "criador encontrado"
                : "criadores encontrados"}
            </p>
            <div className="creator-grid">
              {visibleCreators.map((creator) => (
                <CreatorCard key={creator.name} creator={creator} />
              ))}
            </div>
          </>
        )}
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreatorAvatar } from "@/components/creator-avatar";
import { searchCatalog, getMarketCreators } from "@/features/catalog/api";
import { catalogSearchSchema } from "@/features/catalog/search";

export const Route = createFileRoute("/criadores/$creatorName")({
  validateSearch: catalogSearchSchema,
  component: CreatorProfilePage,
});

function CreatorProfilePage() {
  const { creatorName } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/criadores/$creatorName" });
  const page = search.pagina ?? 1;
  const sort = search.ordenar ?? "recentes";
  const creatorQuery = useQuery({
    queryKey: ["market-creators"],
    queryFn: ({ signal }) => getMarketCreators(signal),
  });
  const nftsQuery = useQuery({
    queryKey: ["creator-nfts", creatorName, page, sort],
    queryFn: ({ signal }) =>
      searchCatalog(
        {
          criador: creatorName,
          pagina: page,
          ordenar: sort,
        },
        signal,
      ),
  });
  const normalizedCreatorName = creatorName.trim().toLocaleLowerCase();
  const creator = creatorQuery.data?.find(
    (item) => item.name.trim().toLocaleLowerCase() === normalizedCreatorName,
  );

  function updateSearch(patch: Partial<typeof search>) {
    void navigate({
      search: (previous) => ({ ...previous, ...patch }),
      resetScroll: true,
    });
  }

  return (
    <div className="creator-profile-page">
      <div className="container creator-breadcrumb">
        <Link to="/criadores">CRIADORES</Link>
        <span>/</span>
        <span>{creatorName}</span>
      </div>

      {creatorQuery.isPending && (
        <section className="container creator-profile-loading" aria-busy="true">
          <div className="creator-profile-loading-art" />
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> PERFIL DO CRIADOR
            </div>
            <h1>{creatorName}</h1>
            <p>Carregando as obras deste criador...</p>
          </div>
        </section>
      )}

      {creatorQuery.isError && (
        <section className="container creator-profile-state" role="alert">
          <h1>Não foi possível carregar este perfil.</h1>
          <p>Tente novamente para ver as obras do criador.</p>
          <button
            type="button"
            className="button button-outline"
            onClick={() => void creatorQuery.refetch()}
          >
            TENTAR NOVAMENTE
          </button>
        </section>
      )}

      {creatorQuery.isSuccess && !creator && (
        <section className="container creator-profile-state" role="status">
          <h1>Criador não encontrado.</h1>
          <p>Este nome não aparece entre os criadores das obras do Kurio.</p>
          <Link to="/criadores" className="button button-outline">
            VOLTAR A CRIADORES
          </Link>
        </section>
      )}

      {creator && (
        <>
          <section className="container creator-profile-header">
            <div className="creator-profile-art">
              <CreatorAvatar
                name={creator.name}
                avatar={creator.avatar}
                className="creator-avatar-profile"
              />
            </div>
            <div className="creator-profile-copy">
              <div className="eyebrow">
                <span className="eyebrow-line" /> CRIADOR KURIO
              </div>
              <h1>{creator.name}</h1>
              <p>
                Explore as obras e coleções associadas a este criador no
                marketplace Kurio.
              </p>
              <div className="creator-profile-stats">
                <span>
                  <strong>{creator.nftCount}</strong>
                  {creator.nftCount === 1 ? "obra" : "obras"}
                </span>
                <span>
                  <strong>{creator.collections.length}</strong>
                  {creator.collections.length === 1
                    ? "coleção"
                    : "coleções"}
                </span>
              </div>
              <div className="creator-profile-collections">
                {creator.collections.map((collection) => (
                  <Link
                    key={collection}
                    to="/colecoes/$collectionName"
                    params={{ collectionName: collection }}
                  >
                    {collection} <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section
            className="container creator-works"
            aria-labelledby="creator-works-title"
          >
            <div className="creator-works-heading">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-line" /> CRIAÇÕES
                </div>
                <h2 id="creator-works-title">Obras de {creator.name}</h2>
              </div>
              <label className="creator-sort">
                <span>Ordenar por</span>
                <select
                  aria-label="Ordenar obras do criador"
                  value={sort}
                  onChange={(event) =>
                    updateSearch({
                      ordenar: event.target.value as typeof sort,
                      pagina: 1,
                    })
                  }
                >
                  <option value="recentes">Mais recentes</option>
                  <option value="preco-asc">Menor preço</option>
                  <option value="preco-desc">Maior preço</option>
                </select>
              </label>
            </div>

            {nftsQuery.isPending && (
              <div className="nft-grid">
                {Array.from({ length: 8 }, (_, index) => (
                  <div className="nft-skeleton" key={index} aria-hidden="true">
                    <div className="skeleton-image" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                  </div>
                ))}
              </div>
            )}

            {nftsQuery.isError && (
              <div className="state-panel" role="alert">
                <strong>Não foi possível carregar as obras.</strong>
                <p>Verifique a conexão e tente novamente.</p>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void nftsQuery.refetch()}
                >
                  TENTAR NOVAMENTE
                </button>
              </div>
            )}

            {nftsQuery.data && nftsQuery.data.items.length === 0 && (
              <div className="state-panel" role="status">
                <strong>Este criador ainda não tem obras disponíveis.</strong>
                <p>Volte ao diretório para conhecer outros criadores.</p>
                <Link to="/criadores" className="button button-outline">
                  VER CRIADORES
                </Link>
              </div>
            )}

            {nftsQuery.data && nftsQuery.data.items.length > 0 && (
              <>
                <div className="creator-work-grid">
                  {nftsQuery.data.items.map((nft, index) => (
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
                          EDIÇÃO #{String(nft.edition).padStart(3, "0")}
                        </span>
                      </Link>
                      <div className="nft-info">
                        <Link
                          className="creator-work-collection"
                          to="/colecoes/$collectionName"
                          params={{ collectionName: nft.collection }}
                        >
                          {nft.collection}
                        </Link>
                        <Link
                          to="/nfts/$nftId"
                          params={{ nftId: nft.id }}
                          className="nft-name"
                        >
                          {nft.name}
                        </Link>
                        <div className="collection-nft-details">
                          <span>Rede: {nft.network}</span>
                          <span>
                            {nft.available > 0
                              ? `${nft.available} disponíveis`
                              : "Indisponível"}
                          </span>
                        </div>
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
                {nftsQuery.data.pagination.pages > 1 && (
                  <nav
                    className="creator-pagination"
                    aria-label="Paginação das obras do criador"
                  >
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={page <= 1}
                      onClick={() => updateSearch({ pagina: page - 1 })}
                    >
                      ← ANTERIOR
                    </button>
                    <span>
                      Página {page} de {nftsQuery.data.pagination.pages}
                    </span>
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={page >= nftsQuery.data.pagination.pages}
                      onClick={() => updateSearch({ pagina: page + 1 })}
                    >
                      PRÓXIMA →
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

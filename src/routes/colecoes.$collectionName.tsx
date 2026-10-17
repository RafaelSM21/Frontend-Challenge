import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layers3 } from "lucide-react";
import { searchCatalog } from "@/features/catalog/api";
import { catalogSearchSchema } from "@/features/catalog/search";

export const Route = createFileRoute("/colecoes/$collectionName")({
  validateSearch: catalogSearchSchema,
  component: CollectionPage,
});

function CollectionPage() {
  const { collectionName } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/colecoes/$collectionName" });
  const page = search.pagina ?? 1;
  const sort = search.ordenar ?? "recentes";
  const query = useQuery({
    queryKey: ["collection-nfts", collectionName, page, sort],
    queryFn: ({ signal }) =>
      searchCatalog(
        {
          colecao: [collectionName],
          pagina: page,
          ordenar: sort,
        },
        signal,
      ),
  });
  const collection = query.data?.items[0];

  function updateSearch(patch: Partial<typeof search>) {
    void navigate({
      search: (previous) => ({ ...previous, ...patch }),
      resetScroll: true,
    });
  }

  return (
    <div className="collection-page">
      <div className="container collection-breadcrumb">
        <Link to="/mercado">MERCADO</Link>
        <span>/</span>
        <span>{collectionName}</span>
      </div>

      <section className="container collection-detail-header">
        <div className="collection-detail-art" aria-hidden="true">
          {query.data?.items.slice(0, 4).map((nft, index) => (
            <img
              key={nft.id}
              src={nft.image}
              className={`collection-detail-art-${index + 1}`}
              alt=""
            />
          ))}
          {query.isPending && <div className="collection-detail-art-loading" />}
        </div>
        <div className="collection-detail-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> COLEÇÃO KURIO
          </div>
          <h1>{collectionName}</h1>
          {collection ? (
            <>
              <p className="collection-detail-creator">
                por <strong>{collection.creator}</strong>
              </p>
              <p className="collection-detail-description">
                Explore as obras desta coleção. Cada NFT tem preço e
                disponibilidade próprios.
              </p>
              <div className="collection-detail-meta">
                <span>
                  <Layers3 aria-hidden="true" />
                  {query.data?.pagination.total ?? 0} NFTs
                </span>
                <span>
                  {collection.network === "ethereum"
                    ? "Ethereum"
                    : collection.network}
                </span>
                <span>
                  {collection.category.replaceAll("-", " ")}
                </span>
              </div>
            </>
          ) : (
            <p className="collection-detail-description">
              Explore as obras disponíveis desta coleção.
            </p>
          )}
        </div>
      </section>

      <section
        className="container collection-nfts"
        aria-labelledby="collection-nfts-title"
      >
        <div className="collection-nfts-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> EXPLORE AS OBRAS
            </div>
            <h2 id="collection-nfts-title">NFTs da coleção</h2>
          </div>
          <label className="collection-sort">
            <span>Ordenar por</span>
            <select
              aria-label="Ordenar NFTs da coleção"
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

        {query.isPending && (
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

        {query.isError && (
          <div className="state-panel" role="alert">
            <strong>Não foi possível carregar os NFTs desta coleção.</strong>
            <p>Verifique a conexão e tente novamente.</p>
            <button
              className="button button-primary"
              type="button"
              onClick={() => void query.refetch()}
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        )}

        {query.data && query.data.items.length === 0 && (
          <div className="state-panel" role="status">
            <strong>Não encontramos NFTs para esta coleção.</strong>
            <p>Volte ao Mercado para descobrir outras coleções.</p>
            <Link className="button button-outline" to="/mercado">
              VOLTAR AO MERCADO
            </Link>
          </div>
        )}

        {query.data && query.data.items.length > 0 && (
          <>
            <div className="collection-nft-grid">
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
                      EDIÇÃO #{String(nft.edition).padStart(3, "0")}
                    </span>
                  </Link>
                  <div className="nft-info">
                    <span className="nft-collection">{nft.creator}</span>
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
            {query.data.pagination.pages > 1 && (
              <nav className="collection-pagination" aria-label="Paginação dos NFTs">
                <button
                  className="button button-outline"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => updateSearch({ pagina: page - 1 })}
                >
                  ← ANTERIOR
                </button>
                <span>
                  Página {page} de {query.data.pagination.pages}
                </span>
                <button
                  className="button button-outline"
                  type="button"
                  disabled={page >= query.data.pagination.pages}
                  onClick={() => updateSearch({ pagina: page + 1 })}
                >
                  PRÓXIMA →
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}

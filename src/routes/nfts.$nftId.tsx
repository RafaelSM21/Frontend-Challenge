import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { getNftDetails, getRelatedNfts } from "@/features/nft-detail/api";
import { getFavoriteIds, setFavorite } from "@/features/favorites/api";
import { addNftToServerCart } from "@/features/cart/api";
import { addCartItem } from "@/features/cart/storage";
import { getSession } from "@/features/auth/session";
import { apiErrorMessage, type Nft } from "@/lib/contracts";

export const Route = createFileRoute("/nfts/$nftId")({
  component: NftDetailPage,
});

function NftDetailPage() {
  const { nftId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = getSession();
  const [editionNumber, setEditionNumber] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [favoriteMessage, setFavoriteMessage] = useState("");

  const nftQuery = useQuery({
    queryKey: ["nft", nftId],
    queryFn: async ({ signal }) => getNftDetails(nftId, signal),
  });

  const relatedQuery = useQuery({
    queryKey: ["nfts", "related", nftId],
    enabled: Boolean(nftQuery.data),
    queryFn: async ({ signal }) => getRelatedNfts(signal),
  });

  const favoritesQuery = useQuery({
    queryKey: ["favorites", session?.user?.id],
    enabled: Boolean(session?.user?.id),
    queryFn: getFavoriteIds,
  });

  const nft = nftQuery.data;
  const isFavorite = favoritesQuery.data?.includes(nftId) ?? false;
  const galleryImages = nft ? [nft.image, nft.image, nft.image, nft.image] : [];
  const currentImage = galleryImages[activeImage] ?? "";

  const related = useMemo(() => {
    if (!relatedQuery.data || !nft) return [];
    return relatedQuery.data.filter((item) => item.id !== nft.id).slice(0, 5);
  }, [nft, relatedQuery.data]);

  useEffect(() => {
    setEditionNumber(1);
    setActiveImage(0);
  }, [nftId]);

  const favoriteMutation = useMutation({
    mutationFn: async (next: boolean) => setFavorite(nftId, next),
    onMutate: async (next) => {
      const key = ["favorites", session?.user?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);
      queryClient.setQueryData<string[]>(key, (current = []) =>
        next
          ? [...new Set([...current, nftId])]
          : current.filter((id) => id !== nftId),
      );
      return { previous, key };
    },
    onError: (error, _next, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
      setFavoriteMessage(
        apiErrorMessage(error, "Não foi possível atualizar os favoritos."),
      );
    },
    onSuccess: (items) =>
      queryClient.setQueryData(["favorites", session?.user?.id], items),
  });

  const cartMutation = useMutation({
    mutationFn: async () => addNftToServerCart(nftId, editionNumber, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["cart", session?.user?.id],
      });
      void navigate({ to: "/carrinho" });
    },
    onError: (error) =>
      toast.error(
        apiErrorMessage(error, "Não foi possível adicionar ao carrinho."),
      ),
  });

  const toggleFavorite = () => {
    if (!session?.user?.id) {
      void navigate({ to: "/login" });
      return;
    }
    setFavoriteMessage("");
    favoriteMutation.mutate(!isFavorite);
  };

  const addToCart = () => {
    if (!nft || available < quantity || quantity < 1) return;
    if (session) {
      cartMutation.mutate();
      return;
    }
    addCartItem({
      nftId: nft.id,
      name: nft.name,
      image: nft.image,
      priceEth: nft.priceEth,
      network: nft.network,
      quantity,
      available,
      editionNumber,
    });
    void navigate({ to: "/carrinho" });
  };

  if (nftQuery.isPending) return <DetailSkeleton />;

  if (nftQuery.isError) {
    const isNotFound =
      axios.isAxiosError(nftQuery.error) &&
      nftQuery.error.response?.status === 404;
    return (
      <section className="detail-state container" aria-live="polite">
        <span className="eyebrow">
          <span className="eyebrow-line" />{" "}
          {isNotFound ? "OBRA NÃO ENCONTRADA" : "ERRO AO CARREGAR"}
        </span>
        <h1>
          {isNotFound
            ? "Esta obra não existe."
            : "Não foi possível carregar esta obra."}
        </h1>
        <p>
          {isNotFound
            ? "O NFT pode ter sido removido ou o endereço pode estar incorreto."
            : "Tente novamente. A disponibilidade e o preço são sempre consultados pela API."}
        </p>
        <div className="detail-state-actions">
          <button
            className="button button-primary"
            onClick={() => nftQuery.refetch()}
          >
            TENTAR NOVAMENTE
          </button>
          <Link className="button button-outline" to="/">
            VOLTAR AO MERCADO
          </Link>
        </div>
      </section>
    );
  }

  if (!nft) return null;

  const available = Math.max(0, nft.available);

  return (
    <div className="nft-detail-page">
      <div className="container detail-breadcrumb">
        <Link to="/">INÍCIO</Link>
        <span>/</span>
        <Link to="/">MERCADO</Link>
      </div>

      <section className="container nft-detail-main">
        <div className="nft-gallery">
          <div className="nft-thumbnails" aria-label="Imagens da obra">
            {galleryImages.map((image, index) => (
              <button
                key={image}
                type="button"
                className={`nft-thumbnail ${activeImage === index ? "is-active" : ""}`}
                aria-label={`Ver imagem ${index + 1}`}
                aria-pressed={activeImage === index}
                onClick={() => setActiveImage(index)}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
          <div className="nft-main-image-wrap">
            <img
              className="nft-main-image"
              src={currentImage}
              alt={nft.name}
              fetchPriority="high"
            />
            <span className="nft-image-edition">
              EDIÇÃO #{String(nft.edition).padStart(2, "0")}
            </span>
            <button
              className="nft-zoom"
              type="button"
              aria-label="Ampliar imagem"
              onClick={() =>
                window.open(currentImage, "_blank", "noopener,noreferrer")
              }
            >
              ⌕
            </button>
          </div>
        </div>

        <div className="nft-detail-copy">
          <div className="nft-detail-title-row">
            <div>
              <h1>{nft.name}</h1>
            </div>
            <button
              className={`favorite-detail ${isFavorite ? "is-favorite" : ""}`}
              type="button"
              aria-label={
                isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"
              }
              aria-pressed={isFavorite}
              onClick={toggleFavorite}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
          </div>

          <div className="nft-price-rating">
            <strong>Ξ {nft.priceEth} ETH</strong>
            <div className="nft-rating">
              <span className="stars" aria-label="4.8 de 5">
                ★★★★★
              </span>
              <span>19 avaliações de colecionadores</span>
            </div>
          </div>
          {favoriteMessage && (
            <p className="error-message" role="alert">
              {favoriteMessage}
            </p>
          )}

          <div className="nft-description">
            <strong>Sobre este NFT:</strong>
            <p>{nft.description}</p>
          </div>

          <div className="nft-editions">
            <strong>Escolha a edição:</strong>
            <div role="group" aria-label="Selecionar edição">
              {Array.from(
                { length: Math.max(1, nft.editionTotal) },
                (_, index) => index + 1,
              ).map((edition) => (
                <button
                  key={edition}
                  type="button"
                  className={editionNumber === edition ? "selected" : ""}
                  aria-pressed={editionNumber === edition}
                  disabled={available === 0}
                  onClick={() => setEditionNumber(edition)}
                >
                  #{edition}
                </button>
              ))}
            </div>
            <small>
              {available}{" "}
              {available === 1 ? "unidade disponível" : "unidades disponíveis"}.
              A unidade escolhida será registrada no pedido.
            </small>
          </div>

          <div className="nft-buy-row">
            <div className="quantity-control" aria-label="Quantidade">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <span>
                {quantity} {quantity === 1 ? "unidade" : "unidades"}
              </span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                disabled={quantity >= available}
                onClick={() =>
                  setQuantity((value) => Math.min(available, value + 1))
                }
              >
                +
              </button>
            </div>
            <button
              className="button button-primary nft-buy-button"
              type="button"
              disabled={available === 0 || quantity > available}
              onClick={addToCart}
            >
              {available === 0 ? "INDISPONÍVEL" : "COMPRAR"}{" "}
              <span aria-hidden="true">↗</span>
            </button>
            <button
              className={`favorite-wide ${isFavorite ? "is-favorite" : ""}`}
              type="button"
              onClick={toggleFavorite}
            >
              {isFavorite ? "♥" : "♡"} <span>Favoritar</span>
            </button>
          </div>

          <div className="nft-meta-lines">
            <p>
              <span>ID do token:</span> #
              {nft.id.replace("nft-", "").padStart(4, "0")}
            </p>
            <p>
              <span>Coleção:</span>{" "}
              <Link
                to="/colecoes/$collectionName"
                params={{ collectionName: nft.collection }}
              >
                {nft.collection}
              </Link>
            </p>
            <p>
              <span>Atributos:</span>{" "}
              {nft.traits.map((trait) => trait.value).join(", ")}
            </p>
            <p>
              <span>Compartilhar este NFT:</span> in&nbsp; ✉ &nbsp;♥
            </p>
          </div>
        </div>
      </section>

      <section className="container nft-info-section">
        <div className="nft-tabs" role="tablist">
          <button
            className="is-active"
            type="button"
            role="tab"
            aria-selected="true"
          >
            DETALHES DO NFT
          </button>
          <button type="button" role="tab" aria-selected="false">
            AVALIAÇÕES DE COLECIONADORES (19)
          </button>
        </div>
        <div className="nft-info-grid">
          <p>
            {nft.description} Cada atributo fica armazenado nos metadados do
            token e verificado na Ethereum. A obra explora identidade, movimento
            e luz em um mundo digital sem fronteiras.
          </p>
          <p>
            A propriedade inclui a arte em alta resolução, lançamentos
            exclusivos para colecionadores e um registro permanente de
            procedência registrado na rede.
          </p>
          <dl className="nft-detail-list">
            <dt>Rede:</dt>
            <dd>
              Cunhado na {nft.network === "ethereum" ? "Ethereum" : nft.network}{" "}
              com procedência imutável e metadados armazenados no IPFS.
            </dd>
            <dt>Contrato:</dt>
            <dd>
              Direitos autorais do criador: 5% nas vendas secundárias, pagos
              automaticamente pelos mercados compatíveis.
            </dd>
            <dt>Direitos autorais:</dt>
            <dd>0x7A42...19E8 • Contrato inteligente ERC-721 verificado.</dd>
          </dl>
        </div>
      </section>

      <section className="container related-nfts">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> DA MESMA COLEÇÃO
            </div>
            <h2>
              Mais desta <em>coleção.</em>
            </h2>
          </div>
          <Link className="text-link" to="/">
            VER TODAS AS OBRAS <span>↗</span>
          </Link>
        </div>
        {relatedQuery.isPending && (
          <div className="nft-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="nft-skeleton" key={index}>
                <div className="skeleton-image" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ))}
          </div>
        )}
        {related.length > 0 && (
          <div className="nft-grid">
            {related.map((item) => (
              <RelatedCard key={item.id} nft={item} />
            ))}
          </div>
        )}
        {!relatedQuery.isPending && related.length === 0 && (
          <p className="related-empty">
            Ainda não há outras obras desta coleção.
          </p>
        )}
      </section>
    </div>
  );
}

function RelatedCard({ nft }: { nft: Nft }) {
  return (
    <article className="nft-card">
      <Link
        className="nft-image-link"
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
      >
        <img src={nft.image} alt={nft.name} />
        <span className="nft-edition">{nft.collection}</span>
      </Link>
      <div className="nft-info">
        <span className="nft-collection">{nft.creator}</span>
        <Link className="nft-name" to="/nfts/$nftId" params={{ nftId: nft.id }}>
          {nft.name}
        </Link>
        <div className="nft-card-bottom">
          <div>
            <span>PREÇO</span>
            <strong>Ξ {nft.priceEth}</strong>
          </div>
          <div>
            <span>REDE</span>
            <strong>{nft.network}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div className="nft-detail-page" aria-busy="true">
      <div className="container detail-breadcrumb" aria-hidden="true">
        <span className="detail-skeleton-breadcrumb" />
      </div>
      <section
        className="container nft-detail-main detail-skeleton"
        aria-label="Carregando detalhes do NFT"
      >
        <div className="nft-gallery">
          <div className="nft-thumbnails" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="detail-skeleton-thumbnail" key={index} />
            ))}
          </div>
          <div className="nft-main-image-wrap">
            <div className="detail-skeleton-gallery" />
          </div>
        </div>
        <div className="detail-skeleton-copy" aria-hidden="true">
          <div className="skeleton-line" />
          <div className="skeleton-line long" />
          <div className="skeleton-line" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      </section>
      <section
        className="container nft-info-section detail-skeleton-info"
        aria-hidden="true"
      >
        <div className="nft-tabs">
          <span className="detail-skeleton-tab" />
          <span className="detail-skeleton-tab short" />
        </div>
        <div className="nft-info-grid">
          <div className="detail-skeleton-paragraph">
            <span />
            <span />
          </div>
          <div className="detail-skeleton-paragraph">
            <span />
            <span />
          </div>
          <div className="detail-skeleton-list">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index}>
                <span />
                <span />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section
        className="container related-nfts detail-skeleton-related"
        aria-hidden="true"
      >
        <div className="section-heading">
          <div className="detail-skeleton-heading" />
        </div>
        <div className="nft-grid">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="nft-skeleton" key={index}>
              <div className="skeleton-image" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

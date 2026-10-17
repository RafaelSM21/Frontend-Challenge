import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, X } from "lucide-react";
import { AccountSection } from "@/components/layout/account-section";
import { getFavoriteIds, setFavorite } from "@/features/favorites/api";
import { searchCatalog } from "@/features/catalog/api";
import { getSession } from "@/features/auth/session";
import { queryClient } from "@/app/queryClient";

export const Route = createFileRoute("/interesse")({ beforeLoad: () => { if (!getSession()) throw redirect({ to: "/login" }); }, component: FavoritesPage });

function FavoritesPage() {
  const userId = getSession()?.user.id;
  const favoritesQuery = useQuery({ queryKey: ["favorites", userId], enabled: Boolean(userId), queryFn: getFavoriteIds });
  const catalogQuery = useQuery({
    queryKey: ["favorite-catalog", userId],
    enabled: Boolean(userId && favoritesQuery.data?.length),
    queryFn: async ({ signal }) => {
      const first = await searchCatalog({ pagina: 1, ordenar: "recentes" }, signal);
      const pages = await Promise.all(Array.from({ length: Math.max(0, first.pagination.pages - 1) }, (_, i) => searchCatalog({ pagina: i + 2, ordenar: "recentes" }, signal)));
      return [...first.items, ...pages.flatMap((page) => page.items)];
    },
  });
  const favorites = catalogQuery.data?.filter((nft) => favoritesQuery.data?.includes(nft.id)) ?? [];
  async function removeFavorite(id: string) {
    await setFavorite(id, false);
    await queryClient.invalidateQueries({ queryKey: ["favorites", userId] });
    await queryClient.invalidateQueries({ queryKey: ["favorite-catalog", userId] });
  }
  return (
    <AccountSection activePage="favorites" title="Lista de interesse" description="Todos os NFTs que você curtiu ficam reunidos aqui.">
      {favoritesQuery.isPending || catalogQuery.isPending ? <p className="account-feedback" role="status">Carregando seus NFTs curtidos…</p> : null}
      {favoritesQuery.isError || catalogQuery.isError ? <div className="account-empty-state"><h3>Não foi possível carregar sua lista</h3><p>Tente novamente em instantes.</p><button className="button button-secondary" onClick={() => { void favoritesQuery.refetch(); void catalogQuery.refetch(); }}>Tentar novamente</button></div> : null}
      {!favoritesQuery.isPending && !catalogQuery.isPending && !favoritesQuery.isError && !catalogQuery.isError && !favorites.length ? <div className="account-empty-state"><Heart size={30} /><h3>Sua lista ainda está vazia</h3><p>Toque no coração de uma obra para guardá-la nesta lista.</p><Link className="button button-primary" to="/mercado">Explorar o Mercado</Link></div> : null}
      {favorites.length > 0 ? <div className="account-favorites-grid">{favorites.map((nft) => <article className="account-favorite-card" key={nft.id}><Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="account-favorite-image"><img src={nft.image} alt={nft.name} /></Link><button className="account-favorite-remove" aria-label={`Remover ${nft.name} da lista`} onClick={() => void removeFavorite(nft.id)}><X size={16} /></button><div className="account-favorite-info"><span>{nft.collection}</span><Link to="/nfts/$nftId" params={{ nftId: nft.id }}><strong>{nft.name}</strong></Link><small>{nft.creator}</small><b>Ξ {nft.priceEth} ETH</b></div></article>)}</div> : null}
    </AccountSection>
  );
}

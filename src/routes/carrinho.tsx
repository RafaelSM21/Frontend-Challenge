import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { useEffect, useState } from "react";
import {
  applyCartCoupon,
  getCart,
  getCartQuote,
  removeCartCoupon,
  updateCart,
  type CartResponse,
} from "@/features/cart/api";
import { apiErrorMessage, type CartViewItem } from "@/lib/contracts";
import { CommerceSkeleton } from "@/components/layout/commerce-skeleton";
import { CartItemRow } from "@/components/layout/cart-item-row";
import { getSession } from "@/features/auth/session";
import { readCart, writeCart } from "@/features/cart/storage";

export const Route = createFileRoute("/carrinho")({ component: CartPage });
function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = getSession();
  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const handleNftUpdated = (nativeEvent: Event) => {
      const event = nativeEvent as CustomEvent<{ resourceId: string }>;
      const cart = queryClient.getQueryData<CartResponse>([
        "cart",
        session?.user.id,
      ]);
      if (!cart?.items.some((item) => item.nftId === event.detail.resourceId))
        return;
      setMessage(
        "O preço ou a disponibilidade mudou. O resumo foi atualizado.",
      );
      void queryClient.invalidateQueries({
        queryKey: ["cart", session?.user.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["quote", session?.user.id],
      });
    };
    window.addEventListener("kurio:nft-updated", handleNftUpdated);
    const socketDisconnected = () =>
      setMessage(
        "A conexão em tempo real foi interrompida. Tentaremos reconciliar seu carrinho ao reconectar.",
      );
    const socketReconciled = () =>
      setMessage(
        "Conexão restaurada. O carrinho foi reconciliado com a disponibilidade atual.",
      );
    window.addEventListener("kurio:socket-disconnected", socketDisconnected);
    window.addEventListener("kurio:socket-reconciled", socketReconciled);
    return () => {
      window.removeEventListener("kurio:nft-updated", handleNftUpdated);
      window.removeEventListener(
        "kurio:socket-disconnected",
        socketDisconnected,
      );
      window.removeEventListener("kurio:socket-reconciled", socketReconciled);
    };
  }, [queryClient, session?.user.id]);
  const cartQuery = useQuery({
    queryKey: ["cart", session?.user.id],
    enabled: Boolean(session),
    queryFn: getCart,
  });
  const visitorItems = readCart();
  const data: CartResponse | undefined = session
    ? cartQuery.data
    : {
        cart: {
          items: visitorItems.map(({ nftId, quantity, editionNumber }) => ({
            nftId,
            quantity,
            editionNumber,
          })),
          version: 0,
        },
        items: visitorItems as CartViewItem[],
      };
  const saveCart = useMutation({
    mutationFn: updateCart,
    onSuccess: (next) =>
      queryClient.setQueryData(["cart", session?.user.id], next),
    onError: (error) =>
      setMessage(
        apiErrorMessage(error, "Não foi possível atualizar o carrinho."),
      ),
  });
  const couponMutation = useMutation({
    mutationFn: async () => applyCartCoupon(coupon),
    onSuccess: (next) => {
      queryClient.setQueryData(["cart", session?.user.id], next);
      setMessage("Cupom aplicado.");
      setCoupon("");
    },
    onError: (error) =>
      setMessage(apiErrorMessage(error, "Não foi possível aplicar o cupom.")),
  });
  const removeCoupon = useMutation({
    mutationFn: removeCartCoupon,
    onSuccess: (next) =>
      queryClient.setQueryData(["cart", session?.user.id], next),
  });
  const quoteQuery = useQuery({
    queryKey: ["quote", session?.user.id, data?.cart.version],
    enabled: Boolean(session && data?.items.length),
    queryFn: getCartQuote,
  });
  const update = (
    id: string,
    editionNumber: number | undefined,
    quantity: number,
  ) => {
    if (!data) return;
    const next = data.cart.items
      .map((item) =>
        item.nftId === id && item.editionNumber === editionNumber
          ? { ...item, quantity }
          : item,
      )
      .filter((item) => item.quantity > 0);
    if (session) saveCart.mutate({ items: next, coupon: data.cart.coupon });
    else
      writeCart(
        data.items
          .filter(
            (item) =>
              item.nftId !== id ||
              item.editionNumber !== editionNumber ||
              quantity > 0,
          )
          .map((item) =>
            item.nftId === id && item.editionNumber === editionNumber
              ? { ...item, quantity }
              : item,
          ),
      );
  };
  if (session && cartQuery.isPending)
    return <CommerceSkeleton variant="cart" label="Carregando carrinho…" />;
  if (!data?.items.length)
    return (
      <section className="commerce-empty container">
        <span className="eyebrow">
          <span className="eyebrow-line" /> SEU CARRINHO
        </span>
        <h1>Seu carrinho está vazio.</h1>
        <p>
          Explore obras digitais e encontre a próxima peça para sua coleção.
        </p>
        <Link className="button button-primary" to="/">
          EXPLORAR O MERCADO
        </Link>
      </section>
    );
  const fallbackSubtotal = data.items
    .reduce(
      (sum, item) => sum.plus(new Decimal(item.priceEth).times(item.quantity)),
      new Decimal(0),
    )
    .toFixed();
  const quote = quoteQuery.data;
  return (
    <section className="commerce-page container">
      <div className="commerce-heading">
        <span className="eyebrow">
          <span className="eyebrow-line" /> SEU CARRINHO
        </span>
        <h1>Obras selecionadas.</h1>
      </div>
      <div className="cart-layout">
        <div className="cart-items">
          {data.items.map((item) => (
            <CartItemRow
              key={`${item.nftId}-${item.editionNumber ?? "default"}`}
              item={item}
              disabled={saveCart.isPending}
              onChange={(quantity) =>
                update(item.nftId, item.editionNumber, quantity)
              }
            />
          ))}
        </div>
        <aside className="order-summary">
          <h2>Resumo do pedido</h2>
          {session && (
            <div className="coupon">
              <input
                aria-label="Cupom de desconto"
                value={coupon}
                onChange={(event) =>
                  setCoupon(event.target.value.toUpperCase())
                }
                placeholder="Cupom de desconto"
              />
              <button
                onClick={() => couponMutation.mutate()}
                disabled={couponMutation.isPending}
              >
                Aplicar
              </button>
            </div>
          )}
          {data.cart.coupon && (
            <p className="success-message">
              Cupom {data.cart.coupon} aplicado.{" "}
              <button onClick={() => removeCoupon.mutate()}>Remover</button>
            </p>
          )}
          {message && (
            <p className="error-message" role="alert">
              {message}
            </p>
          )}
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>Ξ {quote?.subtotalEth ?? fallbackSubtotal}</dd>
            </div>
            {quote && (
              <>
                <div>
                  <dt>Desconto</dt>
                  <dd>− Ξ {quote.discountEth}</dd>
                </div>
                <div>
                  <dt>Taxa de rede</dt>
                  <dd>Ξ {quote.networkFeeEth}</dd>
                </div>
                <div className="summary-total">
                  <dt>Total</dt>
                  <dd>Ξ {quote.totalEth}</dd>
                </div>
              </>
            )}
          </dl>
          <button
            className="button button-primary checkout-button"
            onClick={() =>
              session
                ? navigate({ to: "/pagamento" })
                : navigate({ to: "/login" })
            }
          >
            {session ? "IR PARA PAGAMENTO" : "ENTRAR PARA PAGAR"}
          </button>
        </aside>
      </div>
    </section>
  );
}

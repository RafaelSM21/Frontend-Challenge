/**
 * Skeleton do carrinho e do pagamento. Usa as mesmas classes de layout das telas
 * reais (`cart-layout`, `cart-item`, `order-summary`...) para preservar as
 * dimensões e evitar deslocamento de layout quando os dados chegam.
 */
import { CartItemRow } from "@/components/layout/cart-item-row";
import type { CartViewItem } from "@/lib/contracts";

// Item fictício só para dar ao skeleton as mesmas medidas do item real (texto invisível).
const PLACEHOLDER_ITEM: CartViewItem = {
  nftId: "placeholder",
  editionNumber: 1,
  quantity: 1,
  name: "Obra #000",
  image: "",
  priceEth: "0.00",
  network: "ethereum",
  available: 1,
};

type CommerceSkeletonProps = {
  variant: "cart" | "checkout";
  /** Texto anunciado a leitores de tela enquanto carrega. */
  label: string;
};

export function CommerceSkeleton({ variant, label }: CommerceSkeletonProps) {
  const isCart = variant === "cart";
  return (
    <section
      className="commerce-page container commerce-skeleton"
      aria-busy="true"
      data-testid={`${variant}-skeleton`}
    >
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="commerce-heading">
        <span className="eyebrow">
          <span className="eyebrow-line" />{" "}
          {isCart ? "SEU CARRINHO" : "PAGAMENTO SEGURO"}
        </span>
        <h1>{isCart ? "Obras selecionadas." : "Confirme sua compra."}</h1>
      </div>
      <div
        className={isCart ? "cart-layout" : "checkout-layout"}
        aria-hidden="true"
      >
        {isCart ? (
          <div className="cart-items">
            {[0, 1].map((index) => (
              <CartItemRow key={index} placeholder item={PLACEHOLDER_ITEM} />
            ))}
          </div>
        ) : (
          <div className="checkout-form">
            <div className="sk sk-line sk-line-title" />
            <div className="sk sk-field" />
            <div className="sk sk-field" />
            <div className="sk sk-line sk-line-title" />
            <div className="sk sk-field" />
            <div className="sk sk-button" />
          </div>
        )}
        <aside className="order-summary">
          <div className="sk sk-line sk-line-title" />
          {isCart ? <div className="sk sk-field" /> : null}
          <div className="sk sk-line" />
          <div className="sk sk-line" />
          <div className="sk sk-line" />
          <div className="sk sk-button" />
        </aside>
      </div>
    </section>
  );
}

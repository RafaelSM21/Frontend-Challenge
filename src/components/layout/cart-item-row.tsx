import type { CartViewItem } from "@/lib/contracts";

type CartItemRowProps = {
  item: CartViewItem;
  disabled?: boolean;
  onChange?: (quantity: number) => void;
  /** Versão de carregamento: mesmo markup (mesmas medidas), com texto invisível e shimmer. */
  placeholder?: boolean;
};

// GIF transparente 1x1: mantém a proporção da imagem sem baixar nada.
const BLANK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Linha do carrinho, compartilhada pela tela e pelo skeleton para garantir dimensões idênticas. */
export function CartItemRow({
  item,
  disabled = false,
  onChange,
  placeholder = false,
}: CartItemRowProps) {
  const ink = placeholder ? "sk sk-ink" : undefined;
  return (
    <article
      className={placeholder ? "cart-item is-placeholder" : "cart-item"}
    >
      <img
        src={placeholder ? BLANK_IMAGE : item.image}
        alt={placeholder ? "" : item.name}
        className={placeholder ? "sk" : undefined}
      />
      <div>
        <span className={ink}>{item.network.toUpperCase()}</span>
        <h2 className={ink}>{item.name}</h2>
        {item.editionNumber != null && (
          <p className={ink}>Edição #{item.editionNumber}</p>
        )}
        <strong className={ink}>Ξ {item.priceEth} ETH</strong>
        <button
          type="button"
          className={ink}
          disabled={placeholder}
          tabIndex={placeholder ? -1 : undefined}
          onClick={() => onChange?.(0)}
        >
          Remover
        </button>
      </div>
      <div
        className={placeholder ? "cart-quantity sk" : "cart-quantity"}
        role={placeholder ? undefined : "group"}
        aria-label={placeholder ? undefined : `Quantidade de ${item.name}`}
      >
        <button
          type="button"
          aria-label={placeholder ? undefined : `Diminuir ${item.name}`}
          tabIndex={placeholder ? -1 : undefined}
          disabled={placeholder || item.quantity <= 1 || disabled}
          onClick={() => onChange?.(item.quantity - 1)}
        >
          −
        </button>
        <span aria-live={placeholder ? undefined : "polite"}>
          {item.quantity}
        </span>
        <button
          type="button"
          aria-label={placeholder ? undefined : `Aumentar ${item.name}`}
          tabIndex={placeholder ? -1 : undefined}
          disabled={placeholder || item.quantity >= item.available || disabled}
          onClick={() => onChange?.(item.quantity + 1)}
        >
          +
        </button>
      </div>
    </article>
  );
}

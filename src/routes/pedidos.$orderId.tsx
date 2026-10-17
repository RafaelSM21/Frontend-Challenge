import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getOrder } from "@/features/orders/api";
import { getSession } from "@/features/auth/session";

export const Route = createFileRoute("/pedidos/$orderId")({
  beforeLoad: () => {
    if (!getSession()) throw redirect({ to: "/login" });
  },
  component: OrderPage,
});
function OrderPage() {
  const { orderId } = Route.useParams();
  const userId = getSession()!.user.id;
  const orderQuery = useQuery({
    queryKey: ["order", userId, orderId],
    queryFn: async () => getOrder(orderId),
  });
  if (orderQuery.isPending)
    return (
      <section className="commerce-empty container" aria-busy="true">
        <h1>Carregando recibo…</h1>
      </section>
    );
  if (orderQuery.isError || !orderQuery.data)
    return (
      <section className="commerce-empty container">
        <h1>Pedido não encontrado.</h1>
        <Link className="button button-primary" to="/">
          VOLTAR AO MERCADO
        </Link>
      </section>
    );
  const order = orderQuery.data;
  const copy =
    order.status === "confirmed"
      ? {
          label: "COMPRA CONFIRMADA",
          title: "Sua coleção ganhou uma nova obra.",
          mark: "✓",
        }
      : order.status === "pending"
        ? {
            label: "PAGAMENTO PENDENTE",
            title: "Estamos aguardando a confirmação.",
            mark: "…",
          }
        : {
            label: "PAGAMENTO RECUSADO",
            title: "Não foi possível concluir a compra.",
            mark: "!",
          };
  return (
    <section className="confirmation-page container">
      <span className="confirmation-mark">{copy.mark}</span>
      <span className="eyebrow">
        <span className="eyebrow-line" /> {copy.label}
      </span>
      <h1>{copy.title}</h1>
      <p>
        Pedido <strong>#{order.id}</strong> registrado em{" "}
        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
          new Date(order.createdAt),
        )}
        .
      </p>
      <div className="receipt">
        <h2>Recibo</h2>
        {order.items.map((item) => (
          <div className="review-item" key={item.nftId}>
            <img src={item.image} alt={item.name} />
            <span>
              {item.name} × {item.quantity}
              <strong>Ξ {item.priceEth}</strong>
            </span>
          </div>
        ))}
        <div className="receipt-total">
          Total cotado <strong>Ξ {order.quote.totalEth}</strong>
        </div>
        <small>Referência simulada: {order.transactionRef}</small>
      </div>
      <Link className="button button-primary" to="/">
        CONTINUAR EXPLORANDO
      </Link>
    </section>
  );
}

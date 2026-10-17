import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Clock3, ReceiptText } from "lucide-react";
import { AccountSection } from "@/components/layout/account-section";
import { getSession } from "@/features/auth/session";
import { readOrders } from "@/features/orders/storage";

export const Route = createFileRoute("/atividade")({ beforeLoad: () => { if (!getSession()) throw redirect({ to: "/login" }); }, component: ActivityPage });

function ActivityPage() {
  const orders = readOrders();
  return (
    <AccountSection activePage="activity" title="Minha atividade" description="Acompanhe suas compras e o histórico de pedidos nesta conta.">
      {orders.length ? (
        <div className="account-record-list">
          {orders.map((order) => (
            <article className="account-record" key={order.id}>
              <span className="account-record-icon"><ReceiptText size={20} /></span>
              <div className="account-record-main">
                <strong>Pedido {order.id}</strong>
                <span>{order.items.map((item) => item.name).join(", ")}</span>
                <small><Clock3 size={13} /> {new Date(order.createdAt).toLocaleString("pt-BR")}</small>
              </div>
              <div className="account-record-meta">
                <strong>{order.total.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} ETH</strong>
                <span className="account-status">Compra confirmada</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="account-empty-state"><ReceiptText size={30} /><h3>Você ainda não tem atividades registradas</h3><p>Quando fizer uma compra, os detalhes do pedido aparecerão aqui.</p><Link className="button button-primary" to="/mercado">Explorar o Mercado</Link></div>
      )}
    </AccountSection>
  );
}

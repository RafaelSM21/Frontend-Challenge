import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";
import { AccountSection } from "@/components/layout/account-section";
import { getSession } from "@/features/auth/session";

// Fora do escopo da entrega: a API não expõe listagem de pedidos (só
// GET /orders/:orderId), então não há histórico para mostrar aqui.
export const Route = createFileRoute("/atividade")({
  beforeLoad: () => {
    if (!getSession()) throw redirect({ to: "/login" });
  },
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <AccountSection
      activePage="activity"
      title="Minha atividade"
      description="Acompanhe suas compras e o histórico de pedidos nesta conta."
    >
      <div className="account-empty-state">
        <ReceiptText size={30} />
        <h3>Histórico indisponível nesta demonstração</h3>
        <p>
          O recibo de cada compra é exibido ao finalizar o pedido. A listagem de
          atividades não faz parte desta entrega.
        </p>
        <Link className="button button-primary" to="/mercado">
          Explorar o Mercado
        </Link>
      </div>
    </AccountSection>
  );
}

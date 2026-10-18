import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { AccountSection } from "@/components/layout/account-section";
import { getSession } from "@/features/auth/session";

// Fora do escopo da entrega: não há arquivos baixáveis associados às compras.
// A página existe só para a navegação da conta e não simula nenhum download.
export const Route = createFileRoute("/downloads")({
  beforeLoad: () => {
    if (!getSession()) throw redirect({ to: "/login" });
  },
  component: DownloadsPage,
});

function DownloadsPage() {
  return (
    <AccountSection
      activePage="downloads"
      title="Arquivos baixados"
      description="Acesse os arquivos associados aos NFTs que você comprou."
    >
      <div className="account-empty-state">
        <Download size={30} />
        <h3>Nenhum arquivo disponível ainda</h3>
        <p>
          Esta demonstração não associa arquivos baixáveis às compras, então
          nenhum download é oferecido. Seus pedidos confirmados ficam no recibo
          de cada compra.
        </p>
        <Link className="button button-primary" to="/mercado">
          Explorar o Mercado
        </Link>
      </div>
    </AccountSection>
  );
}

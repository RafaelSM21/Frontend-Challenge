import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, TicketPercent } from "lucide-react";
import { AccountSection } from "@/components/layout/account-section";
import { getSession } from "@/features/auth/session";

export const Route = createFileRoute("/ofertas")({ beforeLoad: () => { if (!getSession()) throw redirect({ to: "/login" }); }, component: OffersPage });

function OffersPage() {
  const [copied, setCopied] = useState(false);
  async function copyCode() {
    try {
      await navigator.clipboard.writeText("KURIO10");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return <AccountSection activePage="offers" title="Ofertas e cupons" description="Confira os cupons disponíveis para aplicar no carrinho.">
    <article className="account-coupon-card">
      <div className="account-coupon-icon"><TicketPercent size={26} /></div>
      <div className="account-coupon-copy"><span className="account-coupon-kicker">CUPOM DE DESCONTO</span><h3>KURIO10</h3><p>10% de desconto no subtotal elegível do carrinho.</p><small>O desconto é validado ao aplicar o cupom no carrinho. Consulte o resumo antes de concluir a compra.</small></div>
      <div className="account-coupon-actions"><button className="button button-secondary" onClick={() => void copyCode()}><Copy size={15} /> {copied ? "Código copiado" : "Copiar código"}</button><Link className="button button-primary" to="/carrinho">Ir ao carrinho</Link></div>
    </article>
    <p className="account-note">Este cupom está configurado no ambiente de demonstração da Kurio. A aplicação confirma sua validade quando você o aplica no carrinho; cupons expirados ou inválidos são recusados.</p>
  </AccountSection>;
}

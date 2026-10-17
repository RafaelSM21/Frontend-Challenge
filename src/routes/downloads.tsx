import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Download, FileImage, PackageCheck } from "lucide-react";
import { AccountSection } from "@/components/layout/account-section";
import { readOrders } from "@/features/orders/storage";
import { getSession } from "@/features/auth/session";

export const Route = createFileRoute("/downloads")({ beforeLoad: () => { if (!getSession()) throw redirect({ to: "/login" }); }, component: DownloadsPage });

function DownloadsPage() {
  const orders = readOrders();
  const items = orders.filter((order) => order.status === "confirmed").flatMap((order) => order.items.map((item) => ({ ...item, orderId: order.id, createdAt: order.createdAt })));
  return <AccountSection activePage="downloads" title="Arquivos baixados" description="Acesse os arquivos associados aos NFTs que você comprou.">
    {items.length ? <div className="account-record-list">{items.map((item) => <article className="account-record" key={`${item.orderId}-${item.nftId}`}><span className="account-record-icon"><FileImage size={20} /></span><div className="account-record-main"><strong>{item.name}</strong><span>Pedido {item.orderId} · Compra em {new Date(item.createdAt).toLocaleDateString("pt-BR")}</span><small><PackageCheck size={13} /> Compra confirmada</small></div><div className="account-record-meta"><span className="account-file-unavailable">Arquivo não disponibilizado</span><small>Consulte os detalhes da obra para verificar o conteúdo adquirido.</small></div></article>)}</div> : <div className="account-empty-state"><Download size={30} /><h3>Nenhum arquivo disponível ainda</h3><p>Após uma compra confirmada, os NFTs adquiridos aparecerão aqui. O download só será habilitado quando o criador disponibilizar um arquivo autorizado.</p><Link className="button button-primary" to="/mercado">Explorar o Mercado</Link></div>}
    {items.length ? <p className="account-note">Os pedidos confirmados aparecem nesta lista, mas o projeto ainda não associa arquivos baixáveis aos itens comprados. Por isso, não mostramos um botão de download falso.</p> : null}
  </AccountSection>;
}

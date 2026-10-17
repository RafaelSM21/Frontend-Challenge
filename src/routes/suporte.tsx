import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MessageCircle, Send } from "lucide-react";
import { AccountSection } from "@/components/layout/account-section";
import { getSession } from "@/features/auth/session";

type SupportTicket = { id: string; subject: string; category: string; message: string; createdAt: string; status: "Registrado neste navegador" };
const STORAGE_KEY = "kurio.support-tickets.v1";
function readTickets(): SupportTicket[] { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); return Array.isArray(value) ? value as SupportTicket[] : []; } catch { return []; } }

export const Route = createFileRoute("/suporte")({ beforeLoad: () => { if (!getSession()) throw redirect({ to: "/login" }); }, component: SupportPage });

function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(readTickets);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Conta e perfil");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ticket: SupportTicket = { id: `SUP-${Date.now().toString().slice(-6)}`, subject: subject.trim(), category, message: message.trim(), createdAt: new Date().toISOString(), status: "Registrado neste navegador" };
    const next = [ticket, ...tickets];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTickets(next); setSubject(""); setMessage("");
    setFeedback("Solicitação salva neste navegador. Ela ainda não foi enviada para uma equipe de atendimento.");
  }
  return <AccountSection activePage="support" title="Suporte" description="Registre uma dúvida ou descreva um problema com sua conta ou compra.">
    <form className="account-support-form" onSubmit={submit}><label>Assunto<input required maxLength={100} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex.: dúvida sobre uma compra" /></label><label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Conta e perfil</option><option>Carteira</option><option>Compra e pagamento</option><option>NFT ou arquivo digital</option><option>Outro assunto</option></select></label><label>Como podemos ajudar?<textarea required rows={5} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Descreva o que aconteceu…" /></label>{feedback ? <p className="account-feedback" role="status">{feedback}</p> : null}<button className="button button-primary" type="submit"><Send size={15} /> Registrar solicitação</button></form>
    <p className="account-note">Neste momento, as solicitações são armazenadas localmente neste navegador para demonstração; não são enviadas a uma central de atendimento.</p>
    {tickets.length ? <section className="account-ticket-history"><h3>Solicitações registradas neste navegador</h3>{tickets.map((ticket) => <article className="account-record" key={ticket.id}><span className="account-record-icon"><MessageCircle size={20} /></span><div className="account-record-main"><strong>{ticket.subject}</strong><span>{ticket.category} · {ticket.id}</span><small>{new Date(ticket.createdAt).toLocaleString("pt-BR")}</small><p>{ticket.message}</p></div><span className="account-status">{ticket.status}</span></article>)}</section> : null}
  </AccountSection>;
}

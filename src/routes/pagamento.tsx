import type { FormEvent } from "react";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  connectCheckoutWallet,
  createCheckoutQuote,
  createOrder,
  disconnectCheckoutWallet,
  getCheckoutCart,
  getCheckoutWallets,
} from "@/features/checkout/api";
import { apiErrorMessage, type Wallet } from "@/lib/contracts";
import {
  clearCheckoutResume,
  readCheckoutResume,
  saveCheckoutResume,
} from "@/features/checkout/resume";
import { CommerceSkeleton } from "@/components/layout/commerce-skeleton";
import { getSession } from "@/features/auth/session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pagamento")({
  beforeLoad: () => {
    if (!getSession()) throw redirect({ to: "/login" });
  },
  component: PaymentPage,
});
function PaymentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = getSession()!;
  const resume = readCheckoutResume(session.user.id);
  const [walletId, setWalletId] = useState(() => resume?.walletId ?? "");
  const [key] = useState(() => resume?.idempotencyKey ?? crypto.randomUUID());
  const [error, setError] = useState("");
  const [isRecoveringOrder, setIsRecoveringOrder] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [realtimeMessages, setRealtimeMessages] = useState<string[]>([]);
  const [reviewedQuoteId, setReviewedQuoteId] = useState<string>();
  const recoveryStarted = useRef(false);
  const cartQuery = useQuery({
    queryKey: ["cart", session.user.id],
    queryFn: getCheckoutCart,
  });
  const walletsQuery = useQuery({
    queryKey: ["wallets", session.user.id],
    queryFn: getCheckoutWallets,
  });
  const quoteQuery = useQuery({
    queryKey: ["quote", session.user.id, cartQuery.data?.cart.version],
    enabled: Boolean(cartQuery.data?.items.length),
    queryFn: createCheckoutQuote,
  });
  const initialQuote = useRef<string | undefined>();
  const selectedWallet = walletsQuery.data?.find(
    (item) => item.id === walletId,
  );

  useEffect(() => {
    saveCheckoutResume({
      userId: session.user.id,
      walletId,
      idempotencyKey: key,
      quoteId: quoteQuery.data?.quoteId ?? resume?.quoteId,
    });
  }, [
    key,
    quoteQuery.data?.quoteId,
    resume?.quoteId,
    session.user.id,
    walletId,
  ]);
  useEffect(() => {
    const quoteId = quoteQuery.data?.quoteId;
    if (quoteId && initialQuote.current && initialQuote.current !== quoteId) {
      setReviewedQuoteId(undefined);
      setQuoteMessage(
        "O preço ou a disponibilidade mudou. Revise a nova cotação antes de confirmar.",
      );
    }
    if (quoteId) initialQuote.current = quoteId;
  }, [quoteQuery.data?.quoteId]);
  useEffect(() => {
    const disconnected = () =>
      setRealtimeMessages((messages) =>
        messages.includes("disconnected")
          ? messages
          : [...messages, "disconnected"],
      );
    const reconciled = () =>
      setRealtimeMessages((messages) =>
        messages.includes("reconciled")
          ? messages
          : [...messages, "reconciled"],
      );
    window.addEventListener("kurio:socket-disconnected", disconnected);
    window.addEventListener("kurio:socket-reconciled", reconciled);
    return () => {
      window.removeEventListener("kurio:socket-disconnected", disconnected);
      window.removeEventListener("kurio:socket-reconciled", reconciled);
    };
  }, []);

  const connectMutation = useMutation({
    mutationFn: async (approved: boolean) =>
      connectCheckoutWallet(walletId, approved),
    onSuccess: (item) => {
      queryClient.setQueryData<Wallet[]>(
        ["wallets", session.user.id],
        (items = []) =>
          items.map((wallet) => (wallet.id === item.id ? item : wallet)),
      );
      setError("Carteira conectada para esta compra.");
    },
    onError: (err) =>
      setError(apiErrorMessage(err, "Não foi possível conectar a carteira.")),
  });
  const disconnectMutation = useMutation({
    mutationFn: async () => disconnectCheckoutWallet(walletId),
    onSuccess: (item) => {
      queryClient.setQueryData<Wallet[]>(
        ["wallets", session.user.id],
        (items = []) =>
          items.map((wallet) => (wallet.id === item.id ? item : wallet)),
      );
      setError("Carteira desconectada.");
    },
    onError: (err) =>
      setError(
        apiErrorMessage(err, "Não foi possível desconectar a carteira."),
      ),
  });
  const orderMutation = useMutation({
    mutationFn: async () =>
      createOrder({ quoteId: quoteQuery.data?.quoteId ?? "", walletId }, key),
    onSuccess: (order) => {
      clearCheckoutResume();
      queryClient.invalidateQueries({ queryKey: ["cart", session.user.id] });
      void navigate({ to: "/pedidos/$orderId", params: { orderId: order.id } });
    },
    onError: (err) => {
      setError(apiErrorMessage(err, "Não foi possível confirmar o pedido."));
    },
  });
  const recoveryMutation = useMutation({
    mutationFn: async () => {
      if (!resume?.quoteId || !resume.walletId)
        throw new Error("Não foi possível recuperar os dados da tentativa.");
      return createOrder(
        { quoteId: resume.quoteId, walletId: resume.walletId },
        key,
      );
    },
    onSuccess: (order) => {
      clearCheckoutResume();
      void navigate({ to: "/pedidos/$orderId", params: { orderId: order.id } });
    },
    onError: (err) => {
      setIsRecoveringOrder(false);
      setError(
        apiErrorMessage(
          err,
          "Não foi possível recuperar o pedido. Tente novamente.",
        ),
      );
    },
  });
  useEffect(() => {
    if (
      recoveryStarted.current ||
      !cartQuery.isSuccess ||
      cartQuery.data.items.length ||
      !resume?.quoteId ||
      !resume.walletId
    )
      return;
    recoveryStarted.current = true;
    setIsRecoveringOrder(true);
    recoveryMutation.mutate();
  }, [cartQuery.data, cartQuery.isSuccess, recoveryMutation, resume]);
  if (
    cartQuery.isPending ||
    (Boolean(cartQuery.data?.items.length) && quoteQuery.isPending)
  )
    return <CommerceSkeleton variant="checkout" label="Atualizando cotação…" />;
  if (isRecoveringOrder || recoveryMutation.isPending)
    return (
      <section className="commerce-empty container" aria-busy="true">
        <h1>Recuperando seu pedido…</h1>
      </section>
    );
  if (!cartQuery.data?.items.length || !quoteQuery.data)
    return (
      <section className="commerce-empty container">
        <h1>{error || "Nenhuma obra para pagar."}</h1>
        {error && <p role="alert">{error}</p>}
        <Link className="button button-primary" to="/">
          VOLTAR AO MERCADO
        </Link>
      </section>
    );
  const needsReview = Boolean(
    quoteMessage && reviewedQuoteId !== quoteQuery.data.quoteId,
  );
  const isWalletStatus =
    error === "Carteira conectada para esta compra." ||
    error === "Carteira desconectada.";
  const walletFieldInvalid =
    Boolean(error) &&
    !isWalletStatus &&
    (!walletId || Boolean(error?.startsWith("Conecte a carteira")));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!selectedWallet) {
      setError("Selecione uma carteira cadastrada para receber seus NFTs.");
      document.getElementById("checkout-wallet")?.focus();
      return;
    }
    if (!selectedWallet.connected) {
      setError("Conecte a carteira selecionada antes de confirmar.");
      document.getElementById("checkout-wallet")?.focus();
      return;
    }
    if (!quoteQuery.data) {
      setError("A cotação ainda não está disponível. Tente novamente.");
      return;
    }
    if (needsReview) {
      setQuoteMessage("Revise a nova cotação antes de confirmar.");
      return;
    }
    saveCheckoutResume({
      userId: session.user.id,
      walletId,
      idempotencyKey: key,
      quoteId: quoteQuery.data.quoteId,
    });
    orderMutation.mutate();
  }
  return (
    <section className="commerce-page container">
      <div className="commerce-heading">
        <span className="eyebrow">
          <span className="eyebrow-line" /> PAGAMENTO SEGURO
        </span>
        <h1>Confirme sua compra.</h1>
        <p>A cotação expira em cinco minutos e será revalidada ao confirmar.</p>
      </div>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit}>
          <h2>Dados do colecionador</h2>
          <label>
            Nome completo
            <input value={session.user.name} readOnly />
          </label>
          <label>
            E-mail
            <input value={session.user.email} readOnly />
          </label>
          <h2>Carteira de recebimento</h2>
          {walletsQuery.data?.length ? (
            <>
              <label>
                Carteira cadastrada
                <select
                  id="checkout-wallet"
                  aria-label="Carteira cadastrada"
                  aria-invalid={walletFieldInvalid || undefined}
                  aria-describedby={
                    error && !isWalletStatus ? "checkout-error" : undefined
                  }
                  value={walletId}
                  onChange={(event) => {
                    setWalletId(event.target.value);
                    setError("");
                  }}
                >
                  <option value="">Selecionar uma carteira</option>
                  {walletsQuery.data.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName} · {item.network.toUpperCase()} ·{" "}
                      {item.connected ? "conectada" : "desconectada"}
                    </option>
                  ))}
                </select>
              </label>
              {selectedWallet && (
                <div className="wallet-connection" aria-live="polite">
                  <p>
                    <strong>{selectedWallet.network.toUpperCase()}</strong> ·{" "}
                    {selectedWallet.address}
                  </p>
                  <p>
                    Status:{" "}
                    {selectedWallet.connected ? "Conectada" : "Desconectada"}
                  </p>
                  {selectedWallet.connected ? (
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                    >
                      DESCONECTAR
                    </button>
                  ) : (
                    <div className="wallet-actions">
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() => connectMutation.mutate(true)}
                        disabled={connectMutation.isPending}
                      >
                        CONECTAR CARTEIRA
                      </button>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => connectMutation.mutate(false)}
                        disabled={connectMutation.isPending}
                      >
                        SIMULAR RECUSA
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="payment-note">
              Cadastre uma carteira antes de concluir a compra.{" "}
              <Link to="/carteiras">GERENCIAR CARTEIRAS</Link>
            </p>
          )}
          {error && (
            <p
              id={isWalletStatus ? undefined : "checkout-error"}
              className={isWalletStatus ? "success-message" : "error-message"}
              role={isWalletStatus ? "status" : "alert"}
            >
              {error}
            </p>
          )}
          {quoteMessage && (
            <p className="error-message" role="status">
              {quoteMessage}
            </p>
          )}
          {realtimeMessages.includes("disconnected") && (
            <p className="success-message" role="status">
              A conexão em tempo real foi interrompida. Seu pedido continua
              protegido pela chave de idempotência.
            </p>
          )}
          {realtimeMessages.includes("reconciled") && (
            <p className="success-message" role="status">
              Conexão restaurada. A cotação e a disponibilidade foram
              verificadas novamente.
            </p>
          )}
          {needsReview && (
            <button
              type="button"
              className="button button-outline checkout-button"
              onClick={() => {
                setReviewedQuoteId(quoteQuery.data.quoteId);
                setQuoteMessage("");
              }}
            >
              REVISAR NOVA COTAÇÃO
            </button>
          )}
          <Button
            className="button button-primary checkout-button"
            type="submit"
            disabled={
              orderMutation.isPending || quoteQuery.isFetching || needsReview
            }
          >
            CONFIRMAR COMPRA · Ξ {quoteQuery.data.totalEth}
          </Button>
        </form>
        <aside className="order-summary">
          <h2>Revisão</h2>
          {cartQuery.data.items.map((item) => (
            <div className="review-item" key={item.nftId}>
              <img src={item.image} alt={item.name} />
              <span>
                {item.name} × {item.quantity}
                <strong>Ξ {item.priceEth}</strong>
              </span>
            </div>
          ))}
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>Ξ {quoteQuery.data.subtotalEth}</dd>
            </div>
            <div>
              <dt>Desconto</dt>
              <dd>− Ξ {quoteQuery.data.discountEth}</dd>
            </div>
            <div>
              <dt>Taxa</dt>
              <dd>Ξ {quoteQuery.data.networkFeeEth}</dd>
            </div>
            <div className="summary-total">
              <dt>Total</dt>
              <dd>Ξ {quoteQuery.data.totalEth}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

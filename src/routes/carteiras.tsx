import type { FormEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Input, FieldError } from "@/components/ui/input";
import { parseApiError } from "@/lib/api-error";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import {
  apiErrorMessage,
  type Network,
  type SaveWalletInput,
  type Wallet,
} from "@/lib/contracts";
import {
  deleteWallet,
  getWallets,
  saveWallet as saveWalletRequest,
} from "@/features/wallets/api";
import { getSession } from "@/features/auth/session";

export const Route = createFileRoute("/carteiras")({
  beforeLoad: () => {
    if (!getSession()) {
      throw redirect({ to: "/login" });
    }
  },
  component: WalletsPage,
});

type WalletForm = SaveWalletInput;

const emptyWallet: WalletForm = {
  displayName: "",
  alias: "",
  network: "ethereum",
  profileName: "",
  address: "",
  type: "self-custody",
  ens: "",
};

function WalletsPage() {
  const queryClient = useQueryClient();
  const userId = getSession()?.user.id;

  const [wallet, setWallet] = useState<WalletForm>(emptyWallet);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const walletsQuery = useQuery({
    queryKey: ["wallets", userId],
    queryFn: getWallets,
  });

  const saveWalletMutation = useMutation({
    mutationFn: ({
      input,
      walletId,
    }: {
      input: WalletForm;
      walletId: string | null;
    }) => saveWalletRequest(input, walletId),

    onSuccess: (saved) => {
      queryClient.setQueryData<Wallet[]>(
        ["wallets", userId],
        (current = []) => {
          const exists = current.some((item) => item.id === saved.id);

          return exists
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [...current, saved];
        },
      );

      setWallet(emptyWallet);
      setEditingId(null);
      setMessage("Carteira salva na sua conta.");
    },

    onError: (error) => {
      const { code, message: text, fields } = parseApiError(error);
      const mapped: Record<string, string> = { ...fields };
      if (
        (code === "INVALID_WALLET_ADDRESS" || code === "WALLET_EXISTS") &&
        text
      )
        mapped.address = text;
      if (Object.keys(mapped).length) {
        setFieldErrors(mapped);
        const first = Object.keys(mapped)[0];
        if (first) document.getElementById(`wallet-${first}`)?.focus();
      }
      setMessage(apiErrorMessage(error, "Não foi possível salvar a carteira."));
    },
  });

  const removeWallet = useMutation({
    mutationFn: deleteWallet,

    onSuccess: (walletId) => {
      queryClient.setQueryData<Wallet[]>(["wallets", userId], (current = []) =>
        current.filter((item) => item.id !== walletId),
      );

      setMessage("Carteira removida.");
    },

    onError: (error) => {
      setMessage(
        apiErrorMessage(error, "Não foi possível remover a carteira."),
      );
    },
  });

  function update<K extends keyof WalletForm>(key: K, value: WalletForm[K]) {
    setWallet((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFieldErrors({});

    saveWalletMutation.mutate({
      input: wallet,
      walletId: editingId,
    });
  }

  function edit(item: Wallet) {
    setEditingId(item.id);

    setWallet({
      displayName: item.displayName,
      alias: item.alias,
      network: item.network,
      profileName: item.profileName,
      address: item.address,
      type: item.type,
      ens: item.ens ?? "",
    });

    setMessage("Editando carteira selecionada.");
  }

  function cancelEdit() {
    setFieldErrors({});
    setEditingId(null);
    setWallet(emptyWallet);
    setMessage("");
  }

  if (walletsQuery.isPending) {
    return (
      <section className="commerce-empty container" aria-busy="true">
        <h1>Carregando carteiras…</h1>
      </section>
    );
  }

  if (walletsQuery.isError) {
    return (
      <section className="commerce-empty container">
        <h1>Não foi possível carregar suas carteiras.</h1>

        <button
          className="button button-primary"
          onClick={() => walletsQuery.refetch()}
        >
          TENTAR NOVAMENTE
        </button>
      </section>
    );
  }

  return (
    <div className="account-page container">
      <AccountSidebar activePage="wallets" />

      <section className="account-content wallet-content">
        <div className="wallet-title">
          <div>
            <h2>{editingId ? "Editar carteira" : "Nova carteira"}</h2>
            <p>
              Estas carteiras ficam disponíveis no pagamento e para receber NFTs
              comprados.
            </p>
          </div>

          {editingId && (
            <button type="button" className="text-link" onClick={cancelEdit}>
              Cancelar edição
            </button>
          )}
        </div>

        <form onSubmit={save}>
          <div className="account-form-grid">
            <label>
              Nome de exibição<span>*</span>
              <Input
                id="wallet-displayName"
                aria-label="Nome de exibição"
                error={fieldErrors.displayName}
                value={wallet.displayName}
                onChange={(event) => update("displayName", event.target.value)}
                required
              />
              <FieldError id="wallet-displayName-error">
                {fieldErrors.displayName}
              </FieldError>
            </label>

            <label>
              Apelido da carteira<span>*</span>
              <Input
                id="wallet-alias"
                aria-label="Apelido da carteira"
                error={fieldErrors.alias}
                value={wallet.alias}
                onChange={(event) => update("alias", event.target.value)}
                required
              />
              <FieldError id="wallet-alias-error">
                {fieldErrors.alias}
              </FieldError>
            </label>

            <label>
              Rede<span>*</span>
              <select
                value={wallet.network}
                onChange={(event) =>
                  update("network", event.target.value as Network)
                }
                required
              >
                <option value="ethereum">Ethereum</option>
                <option value="polygon">Polygon</option>
                <option value="solana">Solana</option>
              </select>
            </label>

            <label>
              Nome do perfil<span>*</span>
              <Input
                id="wallet-profileName"
                aria-label="Nome do perfil"
                error={fieldErrors.profileName}
                value={wallet.profileName}
                onChange={(event) => update("profileName", event.target.value)}
                required
              />
              <FieldError id="wallet-profileName-error">
                {fieldErrors.profileName}
              </FieldError>
            </label>

            <label>
              Endereço da carteira<span>*</span>
              <Input
                id="wallet-address"
                aria-label="Endereço da carteira"
                error={fieldErrors.address}
                placeholder="Endereço da carteira"
                value={wallet.address}
                onChange={(event) => update("address", event.target.value)}
                required
              />
              <FieldError id="wallet-address-error">
                {fieldErrors.address}
              </FieldError>
            </label>

            <label>
              Tipo de carteira<span>*</span>
              <select
                value={wallet.type}
                onChange={(event) =>
                  update("type", event.target.value as WalletForm["type"])
                }
                required
              >
                <option value="self-custody">Autocustódia</option>
                <option value="hardware">Hardware wallet</option>
                <option value="exchange">Exchange</option>
              </select>
            </label>

            <label>
              Nome ENS
              <Input
                id="wallet-ens"
                aria-label="Nome ENS"
                error={fieldErrors.ens}
                placeholder="colecionador.eth"
                value={wallet.ens ?? ""}
                onChange={(event) => update("ens", event.target.value)}
              />
              <FieldError id="wallet-ens-error">{fieldErrors.ens}</FieldError>
            </label>
          </div>

          <button
            className="button button-primary save-account"
            type="submit"
            disabled={saveWalletMutation.isPending}
          >
            {saveWalletMutation.isPending ? "Salvando…" : "Salvar carteira"}
          </button>
        </form>

        <div className="secondary-wallet-heading">
          <div>
            <h3>Carteiras cadastradas</h3>
            <p>
              {walletsQuery.data?.length
                ? "Suas carteiras ficam separadas por conta e permanecem após atualizar a página."
                : "Você ainda não adicionou uma carteira."}
            </p>
          </div>
        </div>

        {walletsQuery.data?.map((item) => (
          <article className="secondary-wallet-form" key={item.id}>
            <div>
              <strong>{item.displayName}</strong>
              <p>
                {item.network.toUpperCase()} · {item.address}
              </p>
              <small>
                {item.type === "self-custody" ? "Autocustódia" : item.type}
              </small>
            </div>

            <div>
              <button
                type="button"
                className="text-link"
                onClick={() => edit(item)}
              >
                Editar
              </button>

              <button
                type="button"
                className="text-link"
                onClick={() => removeWallet.mutate(item.id)}
                disabled={removeWallet.isPending}
              >
                Remover
              </button>
            </div>
          </article>
        ))}

        {message && (
          <p className="account-message" role="status">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}

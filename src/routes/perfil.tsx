import type { FormEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { getSession, setSession } from "@/features/auth/session";
import { apiErrorMessage, type Profile } from "@/lib/contracts";
import {
  changeProfilePassword,
  getProfile,
  updateProfile,
} from "@/features/profile/api";

export const Route = createFileRoute("/perfil")({
  beforeLoad: () => {
    if (!getSession()) throw redirect({ to: "/login" });
  },
  component: ProfilePage,
});
const emptyProfile: Profile = {
  displayName: "",
  username: "",
  email: "",
  ens: "",
  walletAlias: "",
};

async function createAvatarDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Não foi possível processar a imagem.");
  }
  context.fillStyle = "#f5f1eb";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

function ProfilePage() {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const userId = getSession()?.user.id;
  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: getProfile,
  });
  useEffect(() => {
    if (profileQuery.data) setProfile(profileQuery.data);
  }, [profileQuery.data]);
  const saveProfile = useMutation({
    mutationFn: updateProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile", userId], saved);
      void queryClient.invalidateQueries({ queryKey: ["market-creators"] });
      const session = getSession();
      if (session)
        setSession({
          ...session,
          user: {
            ...session.user,
            name: saved.displayName,
            email: saved.email,
            avatar: saved.avatar,
          },
        });
      setMessage("Dados do perfil salvos.");
    },
    onError: (error) =>
      setMessage(apiErrorMessage(error, "Não foi possível salvar o perfil.")),
  });
  const changePassword = useMutation({
    mutationFn: async () =>
      changeProfilePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Senha alterada.");
    },
    onError: (error) =>
      setMessage(apiErrorMessage(error, "Não foi possível alterar a senha.")),
  });
  const update = (key: keyof Profile, value: string) =>
    setProfile((current) => ({ ...current, [key]: value }));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (newPassword || confirmPassword || currentPassword) {
      if (newPassword !== confirmPassword) {
        setMessage("A nova senha e a confirmação não coincidem.");
        return;
      }
      changePassword.mutate();
      return;
    }
    saveProfile.mutate(profile);
  }
  if (profileQuery.isPending)
    return (
      <section className="commerce-empty container" aria-busy="true">
        <h1>Carregando perfil…</h1>
      </section>
    );
  if (profileQuery.isError)
    return (
      <section className="commerce-empty container">
        <h1>Não foi possível carregar seu perfil.</h1>
        <button
          className="button button-primary"
          onClick={() => profileQuery.refetch()}
        >
          Tentar novamente
        </button>
      </section>
    );
  return (
    <div className="account-page container">
      <AccountSidebar activePage="profile" />
      <section className="account-content">
        <h2>Perfil do colecionador</h2>
        <form onSubmit={submit}>
          <div className="account-form-grid">
            <label>
              Nome de exibição
              <input
                value={profile.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                required
              />
            </label>
            <div className="avatar-field">
              <span>Foto de perfil</span>
              <div>
                <span className="avatar-placeholder">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="" />
                  ) : (
                    profile.displayName.slice(0, 1).toUpperCase() || "?"
                  )}
                </span>
                <label className="upload-avatar">
                  Enviar imagem
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Enviar imagem de perfil"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (!file) return;
                      if (!file.type.startsWith("image/")) {
                        setMessage("Selecione um arquivo de imagem.");
                        return;
                      }
                      if (file.size > 2 * 1024 * 1024) {
                        setMessage("A imagem deve ter no máximo 2 MB.");
                        return;
                      }
                      void createAvatarDataUrl(file).then(
                        (avatar) => {
                          update("avatar", avatar);
                          setMessage(
                            "Prévia atualizada. Salve para confirmar.",
                          );
                        },
                        () => setMessage("Não foi possível carregar a imagem."),
                      );
                    }}
                  />
                </label>
                {profile.avatar && (
                  <button
                    className="remove-avatar"
                    type="button"
                    onClick={() => {
                      update("avatar", "");
                      setMessage("Avatar removido. Salve para confirmar.");
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
              <small>
                Se seu nome de usuário corresponder ao identificador de um
                criador, esta foto também será exibida no perfil público dele.
              </small>
            </div>
            <label>
              Nome de usuário
              <input
                value={profile.username}
                onChange={(e) => update("username", e.target.value)}
                required
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={profile.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />
            </label>
            <label>
              Nome ENS
              <input
                value={profile.ens}
                onChange={(e) => update("ens", e.target.value)}
              />
            </label>
            <label>
              Apelido da carteira
              <input
                value={profile.walletAlias}
                onChange={(e) => update("walletAlias", e.target.value)}
                required
              />
            </label>
          </div>
          <h3 className="password-heading">Alterar senha</h3>
          <div className="password-form">
            <label>
              Senha atual
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label>
              Nova senha
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <label>
              Confirmar nova senha
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
          </div>
          {message && (
            <p className="account-message" role="status">
              {message}
            </p>
          )}
          <button
            className="button button-primary save-account"
            type="submit"
            disabled={saveProfile.isPending || changePassword.isPending}
          >
            Salvar
          </button>
        </form>
      </section>
    </div>
  );
}

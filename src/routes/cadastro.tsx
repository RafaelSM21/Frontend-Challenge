import type { FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { mergeGuestCart, registerAccount } from "@/features/auth/api";
import { setSession } from "@/features/auth/session";
import { readCart, writeCart } from "@/features/cart/storage";
import { useDialogFocus } from "@/lib/use-dialog-focus";

export const Route = createFileRoute("/cadastro")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const close = () => {
    void navigate({ to: "/" });
  };
  useDialogFocus(true, dialogRef, nameRef, close);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const session = await registerAccount({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setSession(session);
      const visitorCart = readCart();
      if (visitorCart.length) {
        await mergeGuestCart(visitorCart);
        writeCart([]);
      }
      const resumePath = localStorage.getItem("kurio.resume-path");
      localStorage.removeItem("kurio.resume-path");
      if (resumePath?.startsWith("/")) window.location.assign(resumePath);
      else await navigate({ to: "/" });
    } catch (err: unknown) {
      const message = (
        err as { response?: { data?: { error?: { message?: string } } } }
      )?.response?.data?.error?.message;
      setError(message ?? "Não foi possível criar sua conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-backdrop" aria-hidden="true">
        <div className="auth-backdrop-header">
          <span>KURIO</span>
          <div>
            <b>Início</b>
            <span>Mercado</span>
            <span>Criadores</span>
            <span>Aprenda</span>
          </div>
          <span className="auth-backdrop-enter">↪ Entrar</span>
        </div>
        <div className="auth-backdrop-content">
          <section className="auth-backdrop-hero">
            <small>Bem-vindo à Kurio</small>
            <h1>
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL.
            </h1>
            <p>
              Descubra NFTs selecionados de criadores independentes e arte
              digital verificada.
            </p>
            <span>EXPLORAR</span>
          </section>
          <img
            className="auth-backdrop-feature"
            src="/nfts/NFT%20Artwork%2003.png"
            alt=""
          />
          <div className="auth-backdrop-sidebar">
            <b>Coleções</b>
            {[
              "Arte digital",
              "Fotografia",
              "Música",
              "Arte 3D",
              "Colecionáveis",
              "Generativa",
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="auth-backdrop-grid">
            {[
              ["Emerald Ape #042", "/nfts/NFT%20Artwork%2003.png"],
              ["Sage Nomad #009", "/nfts/NFT%20Artwork%2004.png"],
              ["Neon Vessel #552", "/nfts/NFT%20Artwork%2010.png"],
              ["Cosmic Bloom #118", "/nfts/NFT%20Artwork%2004.png"],
              ["Violet Nomad #314", "/nfts/NFT%20Artwork%2010.png"],
              ["Ivory Baron #088", "/nfts/NFT%20Artwork%2005.png"],
            ].map(([title, image]) => (
              <article key={title}>
                <img src={image} alt="" />
                <span>{title}</span>
                <b>1.19 ETH</b>
              </article>
            ))}
          </div>
        </div>
      </div>
      <div className="auth-scrim" />
      <section
        className="auth-modal register-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
      >
        <button
          type="button"
          className="auth-close"
          aria-label="Fechar cadastro"
          onClick={close}
        >
          ×
        </button>
        <div className="auth-tabs">
          <Link to="/login">Entrar</Link>
          <span>|</span>
          <h1 id="register-title" className="active">
            Criar conta
          </h1>
        </div>
        <p className="auth-description">
          Crie seu perfil de colecionador e conecte uma
          <br className="desktop-only" /> carteira quando quiser.
        </p>
        <form className="auth-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="register-name">
            Nome de usuário
          </label>
          <input
            ref={nameRef}
            id="register-name"
            placeholder="Nome de usuário"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
          />
          <label className="sr-only" htmlFor="register-email">
            E-mail
          </label>
          <input
            id="register-email"
            type="email"
            placeholder="Digite seu e-mail"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label className="sr-only" htmlFor="register-password">
            Senha
          </label>
          <div className="password-field">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder="Senha (mínimo 8 caracteres)"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              ◉̸
            </button>
          </div>
          <label className="sr-only" htmlFor="register-confirm">
            Confirmar senha
          </label>
          <input
            id="register-confirm"
            type="password"
            placeholder="Confirmar senha"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Criando conta…" : "Criar conta"}
          </button>
        </form>
        <div className="auth-divider">
          <span>Ou continue com</span>
        </div>
        <div className="auth-socials">
          <button
            type="button"
            onClick={() =>
              setError(
                "Cadastro com Google ainda não está conectado neste desafio.",
              )
            }
          >
            <b className="google-mark">G</b> Continuar com Google
          </button>
          <button
            type="button"
            onClick={() =>
              setError(
                "Cadastro com Facebook ainda não está conectado neste desafio.",
              )
            }
          >
            <b className="facebook-mark">f</b> Continuar com Facebook
          </button>
        </div>
      </section>
    </div>
  );
}

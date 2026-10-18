import type { FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { loginAccount, mergeGuestCart } from "@/features/auth/api";
import { setSession } from "@/features/auth/session";
import { readCart, writeCart } from "@/features/cart/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const close = () => {
    void navigate({ to: "/" });
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const session = await loginAccount({ email: email.trim(), password });
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
      setError(
        message ??
          "Não foi possível entrar. Verifique seus dados e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
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
              ].map(([name, image]) => (
                <article key={name}>
                  <img src={image} alt="" />
                  <span>{name}</span>
                  <b>1.19 ETH</b>
                </article>
              ))}
            </div>
          </div>
        </div>
        <DialogOverlay className="auth-scrim" />
        <DialogContent
          className="auth-modal"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            emailRef.current?.focus();
          }}
        >
          <button
            type="button"
            className="auth-close"
            aria-label="Fechar login"
            onClick={close}
          >
            ×
          </button>
          <div className="auth-tabs">
            <DialogTitle asChild>
              <h1 className="active">Entrar</h1>
            </DialogTitle>
            <span>|</span>
            <Link to="/cadastro">Criar conta</Link>
          </div>
          <DialogDescription className="auth-description">
            Entre para gerenciar sua carteira, coleção e perfil
            <br className="desktop-only" /> de criador.
          </DialogDescription>
          <form className="auth-form" onSubmit={submit}>
            <Label className="sr-only" htmlFor="login-email">
              E-mail
            </Label>
            <Input
              ref={emailRef}
              id="login-email"
              error={error}
              errorId="login-error"
              type="email"
              autoComplete="email"
              placeholder="contato@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Label className="sr-only" htmlFor="login-password">
              Senha
            </Label>
            <div className="password-field">
              <Input
                id="login-password"
                error={error}
                errorId="login-error"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? "◉" : "◉̸"}
              </button>
            </div>
            <button
              type="button"
              className="forgot-link"
              onClick={() =>
                setNotice(
                  "A recuperação de senha estará disponível quando o fluxo de e-mail for implementado.",
                )
              }
            >
              Esqueceu a senha?
            </button>
            {error && (
              <p id="login-error" className="auth-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="auth-notice" role="status">
                {notice}
              </p>
            )}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
          <div className="auth-divider">
            <span>Ou continue com</span>
          </div>
          <div className="auth-socials">
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Login com Google ainda não está conectado neste desafio.",
                )
              }
            >
              <b className="google-mark">G</b> Continuar com Google
            </button>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Login com Facebook ainda não está conectado neste desafio.",
                )
              }
            >
              <b className="facebook-mark">f</b> Continuar com Facebook
            </button>
          </div>
          <p className="auth-demo-hint">
            Conta de demonstração: rafael@example.com · Kurio123!
          </p>
        </DialogContent>
      </div>
    </Dialog>
  );
}

import type { FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { mergeGuestCart, registerAccount } from "@/features/auth/api";
import { setSession } from "@/features/auth/session";
import { readCart, writeCart } from "@/features/cart/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, FieldError } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseApiError } from "@/lib/api-error";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const close = () => {
    void navigate({ to: "/" });
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    if (password !== confirm) {
      setFieldErrors({ confirm: "As senhas não coincidem." });
      document.getElementById("register-confirm")?.focus();
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
      const { code, message, fields } = parseApiError(err);
      const mapped: Record<string, string> = { ...fields };
      if (code === "EMAIL_EXISTS" && message) mapped.email = message;
      if (Object.keys(mapped).length) {
        setFieldErrors(mapped);
        const first = ["name", "email", "password", "confirm"].find(
          (key) => mapped[key],
        );
        if (first) document.getElementById(`register-${first}`)?.focus();
      } else {
        setError(
          message ?? "Não foi possível criar sua conta. Tente novamente.",
        );
      }
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
        <DialogOverlay className="auth-scrim" />
        <DialogContent
          className="auth-modal register-modal"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            nameRef.current?.focus();
          }}
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
            <DialogTitle asChild>
              <h1 className="active">Criar conta</h1>
            </DialogTitle>
          </div>
          <DialogDescription className="auth-description">
            Crie seu perfil de colecionador e conecte uma
            <br className="desktop-only" /> carteira quando quiser.
          </DialogDescription>
          <form className="auth-form" onSubmit={submit}>
            <Label className="sr-only" htmlFor="register-name">
              Nome de usuário
            </Label>
            <Input
              ref={nameRef}
              id="register-name"
              error={fieldErrors.name}
              placeholder="Nome de usuário"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
            <FieldError id="register-name-error">{fieldErrors.name}</FieldError>
            <Label className="sr-only" htmlFor="register-email">
              E-mail
            </Label>
            <Input
              id="register-email"
              error={fieldErrors.email}
              type="email"
              placeholder="Digite seu e-mail"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <FieldError id="register-email-error">
              {fieldErrors.email}
            </FieldError>
            <Label className="sr-only" htmlFor="register-password">
              Senha
            </Label>
            <div className="password-field">
              <Input
                id="register-password"
                error={fieldErrors.password}
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
            <FieldError id="register-password-error">
              {fieldErrors.password}
            </FieldError>
            <Label className="sr-only" htmlFor="register-confirm">
              Confirmar senha
            </Label>
            <Input
              id="register-confirm"
              error={fieldErrors.confirm}
              type="password"
              placeholder="Confirmar senha"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
            <FieldError id="register-confirm-error">
              {fieldErrors.confirm}
            </FieldError>
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
        </DialogContent>
      </div>
    </Dialog>
  );
}

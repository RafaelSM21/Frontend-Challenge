import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Compass,
  House,
  ShoppingCart,
  UserRound,
  UsersRound,
} from "lucide-react";
import { catalogCategories } from "@/lib/contracts";
import {
  clearSession,
  getSession,
  SESSION_EVENT,
} from "@/features/auth/session";
import { readCart } from "@/features/cart/storage";
import { getCart } from "@/features/cart/api";

function CartIcon() {
  return <img src="/icons/shop.svg" alt="" aria-hidden="true" />;
}

function SearchIcon() {
  return <img src="/icons/search.svg" alt="" aria-hidden="true" />;
}

function UserIcon() {
  return <img src="/icons/user.svg" alt="" aria-hidden="true" />;
}

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileViewport, setIsMobileViewport] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 720px)").matches,
  );
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState(() => getSession());
  const [cartCount, setCartCount] = useState(() =>
    readCart().reduce((total, item) => total + item.quantity, 0),
  );
  const authenticatedCart = useQuery({
    queryKey: ["cart", session?.user.id],
    enabled: Boolean(session),
    queryFn: getCart,
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onExpired = () => {
      void navigate({ to: "/login" });
    };
    window.addEventListener("kurio:session-expired", onExpired);
    return () => window.removeEventListener("kurio:session-expired", onExpired);
  }, [navigate]);

  useEffect(() => {
    const sync = () => {
      const nextSession = getSession();
      setSession(nextSession);
      if (!nextSession)
        setCartCount(
          readCart().reduce((total, item) => total + item.quantity, 0),
        );
    };
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const syncCart = () =>
      setCartCount(
        readCart().reduce((total, item) => total + item.quantity, 0),
      );
    window.addEventListener("kurio:cart-change", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("kurio:cart-change", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    if (session && authenticatedCart.data) {
      setCartCount(
        authenticatedCart.data.cart.items.reduce(
          (total, item) => total + item.quantity,
          0,
        ),
      );
    }
  }, [authenticatedCart.data, session]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const isHome = location.pathname === "/";
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/cadastro";
  const isCommercePage =
    location.pathname === "/carrinho" ||
    location.pathname === "/pagamento" ||
    location.pathname.startsWith("/pedidos/");
  const isAccountPage =
    location.pathname === "/perfil" || location.pathname === "/carteiras";
  const showMobileNavigation =
    isMobileViewport && !isAuthPage && !isCommercePage;
  const isMarket =
    location.pathname === "/mercado" ||
    location.pathname.startsWith("/colecoes/") ||
    location.pathname.startsWith("/nfts/");
  const isCreators = location.pathname.startsWith("/criadores");
  const isLearn = location.pathname === "/aprenda";

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchOpen(false);
    navigate({
      to: "/",
      search: (previous) => ({ ...previous, q: query || undefined, pagina: 1 }),
    });
  }

  return (
    <div
      className={`app-root${isHome ? " app-home" : ""}${isAuthPage ? " app-auth" : ""}${isCommercePage ? " app-commerce" : ""}${isAccountPage ? " app-account" : ""}${showMobileNavigation ? " app-mobile-navigation" : ""}`}
    >
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>

      <header className="site-header">
        <nav aria-label="Principal" className="header-inner">
          <Link to="/" className="brand" aria-label="Kurio, página inicial">
            <span>KURIO</span>
          </Link>

          <div
            className={`header-links ${mobileMenuOpen ? "header-links-open" : ""}`}
          >
            <Link to="/" className={isHome ? "nav-link-active" : ""}>
              Início
            </Link>
            <Link to="/mercado" className={isMarket ? "nav-link-active" : ""}>
              Mercado
            </Link>
            <Link
              to="/criadores"
              className={isCreators ? "nav-link-active" : ""}
            >
              Criadores
            </Link>
            <Link to="/aprenda" className={isLearn ? "nav-link-active" : ""}>Aprenda</Link>
          </div>

          <div className="header-actions">
            <div
              className={`header-search ${searchOpen ? "header-search-open" : ""}`}
            >
              <button
                type="button"
                className="header-icon-button"
                aria-label="Buscar obras"
                onClick={() => setSearchOpen((value) => !value)}
              >
                <SearchIcon />
              </button>
              {searchOpen && (
                <form onSubmit={submitSearch} className="header-search-form">
                  <input
                    autoFocus
                    aria-label="Buscar obras"
                    placeholder="Buscar obras..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </form>
              )}
            </div>

            <Link
              to="/carrinho"
              className="header-cart"
              aria-label={`Carrinho de compras, ${cartCount} ${
                cartCount === 1 ? "item" : "itens"
              }`}
            >
              <CartIcon />
              <span className="cart-count">{cartCount}</span>
            </Link>

            {session ? (
              <div className="header-user-wrap">
                <Link
                  to="/perfil"
                  className="header-user"
                  aria-label={
                    isHome && isMobileViewport
                      ? "Minha conta"
                      : "Abrir meu perfil"
                  }
                >
                  <UserIcon />
                </Link>
                <button
                  type="button"
                  className="header-logout"
                  onClick={() => {
                    clearSession();
                    navigate({ to: "/" });
                  }}
                >
                  Sair
                </button>
              </div>
            ) : (
              <Link to="/login" className="header-login">
                Entrar
              </Link>
            )}

            <button
              className="mobile-menu"
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((value) => !value)}
            >
              ☰
            </button>
          </div>
        </nav>
      </header>

      <main id="conteudo">
        {isCommercePage && (
          <div className="mobile-commerce-header">
            <Link
              to={location.pathname === "/carrinho" ? "/" : "/carrinho"}
              aria-label={location.pathname === "/carrinho" ? "Voltar ao início" : "Voltar ao carrinho"}
            >
              ←
            </Link>
            <strong>
              {location.pathname === "/carrinho"
                ? "Meu carrinho"
                : location.pathname === "/pagamento"
                  ? "Pagamento"
                  : "Pedido"}
            </strong>
          </div>
        )}
        <Outlet />
      </main>

      {showMobileNavigation && (
        <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
          <Link
            to="/"
            aria-current={isHome && !location.hash ? "page" : undefined}
          >
            <House aria-hidden="true" />
            Início
          </Link>
          <Link
            to="/mercado"
            aria-current={
              isMarket && !isHome ? "page" : undefined
            }
          >
            <Compass aria-hidden="true" />
            Mercado
          </Link>
          <Link
            to="/criadores"
            aria-current={
              isCreators ? "page" : undefined
            }
          >
            <UsersRound aria-hidden="true" />
            Criadores
          </Link>
          <Link
            to="/aprenda"
            aria-current={isLearn ? "page" : undefined}
          >
            <BookOpen aria-hidden="true" />
            Aprenda
          </Link>
          <Link to="/carrinho" aria-label="Carrinho de compras">
            <ShoppingCart aria-hidden="true" />
            Carrinho
          </Link>
          <Link
            to={session ? "/perfil" : "/login"}
            aria-label={session ? "Perfil" : "Entrar"}
            aria-current={isAccountPage ? "page" : undefined}
          >
            <UserRound aria-hidden="true" />
            Perfil
          </Link>
        </nav>
      )}

      <footer className="site-footer">
        <div className="footer-highlight">
          <article>
            <span className="footer-feature-icon">W</span>
            <h3>Segurança da carteira</h3>
            <p>
              Proteja sua carteira e colecione arte digital verificada com
              confiança.
            </p>
          </article>
          <article>
            <span className="footer-feature-icon">C</span>
            <h3>Criadores em destaque</h3>
            <p>
              Conheça artistas, estúdios e comunidades que moldam a cultura
              digital na rede.
            </p>
          </article>
          <article>
            <span className="footer-feature-icon">D</span>
            <h3>Alertas de lançamentos</h3>
            <p>
              Receba calendários de cunhagem, novidades de listas de acesso e
              análises do mercado.
            </p>
          </article>
        </div>

        <div className="footer-contact">
          <strong>KURIO</strong>
          <span>
            Feito para colecionadores,
            <br />
            criadores e cultura
          </span>
          <span>contato@email.com</span>
          <span>+55 11 4002 8922</span>
        </div>

        <div className="footer-links">
          <div>
            <h3>Meu perfil</h3>
            <Link to="/perfil">Meu perfil</Link>
            <Link to="/carteiras">Carteiras</Link>
          </div>
          <div>
            <h3>Mercado</h3>
            <Link to="/">Início</Link>
            <Link to="/" hash="catalogo">
              Explorar NFTs
            </Link>
            <Link to="/criadores">
              Criadores
            </Link>
          </div>
          <div>
            <h3>Coleções</h3>
            {catalogCategories.map((category) => (
              <Link
                key={category.value}
                to="/"
                search={(previous) => ({
                  ...previous,
                  categoria: [category.value],
                  pagina: 1,
                })}
              >
                {category.label}
              </Link>
            ))}
          </div>
          <div>
            <h3>Carteiras compatíveis</h3>
            <div className="wallet-badges">
              <span>METAMASK</span>
              <span>WALLETCONNECT</span>
              <span>COINBASE</span>
            </div>
          </div>
        </div>

        <div className="footer-copyright">
          © 2026 Kurio. Propriedade digital para todos.
        </div>
      </footer>
    </div>
  );
}

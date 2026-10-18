import {
  Download,
  Heart,
  LogOut,
  MapPin,
  ShoppingCart,
  Tag,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { clearSession } from "@/features/auth/session";

const accountSections = [
  { Icon: ShoppingCart, label: "Atividade", to: "/atividade", page: "activity" },
  { Icon: Heart, label: "Lista de interesse", to: "/interesse", page: "favorites" },
  { Icon: Tag, label: "Ofertas", to: "/ofertas", page: "offers" },
  { Icon: Download, label: "Arquivos baixados", to: "/downloads", page: "downloads" },
  { Icon: TriangleAlert, label: "Suporte", to: "/suporte", page: "support" },
] as const;

type AccountSidebarProps = {
  activePage: "profile" | "wallets" | "activity" | "favorites" | "offers" | "downloads" | "support";
};

export function AccountSidebar({ activePage }: AccountSidebarProps) {
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <aside className="account-sidebar">
      <h1>Meu perfil</h1>
      <Link
        className={activePage === "profile" ? "selected" : ""}
        to="/perfil"
        aria-current={activePage === "profile" ? "page" : undefined}
      >
        <UserRound aria-hidden="true" size={18} strokeWidth={1.6} />
        Dados do perfil
      </Link>
      <Link
        className={activePage === "wallets" ? "selected" : ""}
        to="/carteiras"
        aria-current={activePage === "wallets" ? "page" : undefined}
      >
        <MapPin aria-hidden="true" size={18} strokeWidth={1.6} />
        Carteiras
      </Link>
      {accountSections.map(({ Icon, label, to, page }) => (
        <Link
          className={activePage === page ? "selected" : ""}
          to={to}
          key={page}
          aria-current={activePage === page ? "page" : undefined}
        >
          <Icon aria-hidden="true" size={18} strokeWidth={1.6} />
          {label}
        </Link>
      ))}
      <button type="button" onClick={() => setConfirmLogout(true)}>
        <LogOut aria-hidden="true" size={18} strokeWidth={1.6} />
        Sair
      </button>
      {confirmLogout && (
        <div className="logout-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmLogout(false); }}>
          <section className="logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title" aria-describedby="logout-modal-description">
            <span className="logout-modal-icon"><LogOut aria-hidden="true" size={22} /></span>
            <h2 id="logout-modal-title">Deseja realmente sair?</h2>
            <p id="logout-modal-description">Você precisará entrar novamente para acessar seu perfil e suas compras.</p>
            <div className="logout-modal-actions">
              <button type="button" className="logout-cancel" onClick={() => setConfirmLogout(false)}>Cancelar</button>
              <button type="button" className="logout-confirm" onClick={() => { clearSession(); setConfirmLogout(false); void navigate({ to: "/" }); }}>Sim, sair</button>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

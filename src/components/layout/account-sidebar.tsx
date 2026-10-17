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
      <button
        type="button"
        onClick={() => {
          clearSession();
          void navigate({ to: "/" });
        }}
      >
        <LogOut aria-hidden="true" size={18} strokeWidth={1.6} />
        Sair
      </button>
    </aside>
  );
}

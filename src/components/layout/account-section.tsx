import type { ReactNode } from "react";
import { AccountSidebar } from "@/components/layout/account-sidebar";

type AccountPage = "activity" | "favorites" | "offers" | "downloads" | "support";

export function AccountSection({
  activePage,
  title,
  description,
  children,
}: {
  activePage: AccountPage;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="account-page container">
      <AccountSidebar activePage={activePage} />
      <section className="account-content account-section-content">
        <header className="account-section-heading">
          <h2>{title}</h2>
          <p>{description}</p>
        </header>
        {children}
      </section>
    </div>
  );
}

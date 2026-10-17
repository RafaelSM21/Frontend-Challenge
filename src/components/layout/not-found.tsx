import { Link } from "@tanstack/react-router";

export function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-muted">O endereço não existe ou foi movido.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-sm bg-accent px-4 py-2 text-accent-fg"
      >
        Voltar ao início
      </Link>
    </section>
  );
}

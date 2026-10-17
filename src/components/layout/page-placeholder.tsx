export function PagePlaceholder({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-12">
      <h1 className="text-2xl font-bold">{title}</h1>
      {note ? <p className="mt-2 text-sm text-muted">{note}</p> : null}
    </section>
  );
}

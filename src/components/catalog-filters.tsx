import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Painel de filtros único do Kurio. Início, Mercado e Criadores o reutilizam,
 * mudando apenas os grupos, a busca e o que vem no rodapé. O markup e as
 * classes (`filters`, `filter-group`, `filter-option`...) são os do Início, para
 * que as três telas tenham exatamente a mesma aparência e o mesmo drawer mobile.
 */

export type FilterOption = { value: string; label: string; count?: number };

export type FilterGroup = {
  id: string;
  heading: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
};

export type FilterPrice = {
  min?: string;
  max?: string;
  onApply: (range: { min?: string; max?: string }) => void;
};

export type FilterSearch = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

type FilterPanelProps = {
  id: string;
  /** Nome acessível do drawer quando aberto no mobile. */
  label: string;
  open: boolean;
  onClose: () => void;
  groups: FilterGroup[];
  search?: FilterSearch;
  price?: FilterPrice;
  /** Chamado por "Limpar tudo", depois de zerar busca e preço locais. */
  onClearAll: () => void;
  panelRef?: RefObject<HTMLElement>;
  /** Conteúdo extra no fim do painel (ex.: NFT em destaque no Início). */
  children?: ReactNode;
};

const PRICE_FLOOR = 0.02;
const PRICE_CEILING = 12.3;
const PRICE_SPAN = PRICE_CEILING - PRICE_FLOOR;

export function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function FilterPanel({
  id,
  label,
  open,
  onClose,
  groups,
  search,
  price,
  onClearAll,
  panelRef,
  children,
}: FilterPanelProps) {
  const internalRef = useRef<HTMLElement>(null);
  const ref = panelRef ?? internalRef;
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  const [minPrice, setMinPrice] = useState(price?.min ?? "");
  const [maxPrice, setMaxPrice] = useState(price?.max ?? "");
  useEffect(() => {
    setMinPrice(price?.min ?? "");
    setMaxPrice(price?.max ?? "");
  }, [price?.min, price?.max]);

  const minimum = Math.max(
    PRICE_FLOOR,
    Math.min(Number(minPrice || String(PRICE_FLOOR)), PRICE_CEILING),
  );
  const maximum = Math.max(
    minimum,
    Math.min(Number(maxPrice || PRICE_CEILING.toFixed(2)), PRICE_CEILING),
  );
  const rangeStart = ((minimum - PRICE_FLOOR) / PRICE_SPAN) * 100;
  const rangeEnd = ((maximum - PRICE_FLOOR) / PRICE_SPAN) * 100;

  const body = (
    <>
      <h2 className="filters-heading">Filtros</h2>
      {search && <SearchField {...search} />}
      {groups.map((group, index) => (
        <div className="filter-group" key={group.id}>
          {index === 0 ? (
            <h3 className="filter-group-heading">
              <span>{group.heading}</span>
              <button
                ref={initialFocusRef}
                type="button"
                className="clear-button"
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                  onClearAll();
                }}
              >
                Limpar tudo
              </button>
            </h3>
          ) : (
            <h3>{group.heading}</h3>
          )}
          {group.options.map((option) => (
            <label className="filter-option" key={option.value}>
              <input
                type="checkbox"
                checked={group.selected.includes(option.value)}
                onChange={() =>
                  group.onChange(toggleInList(group.selected, option.value))
                }
              />
              <span>{option.label}</span>
              {option.count !== undefined && <small>{option.count}</small>}
            </label>
          ))}
        </div>
      ))}
      {price && (
        <div className="filter-group">
          <h3>Faixa de preço</h3>
          <div className="price-slider">
            <div className="price-slider-track">
              <span
                className="price-slider-fill"
                style={{ left: `${rangeStart}%`, right: `${100 - rangeEnd}%` }}
              />
            </div>
            <input
              aria-label="Preço mínimo em ETH"
              className="price-slider-min"
              type="range"
              min="0.02"
              max={maximum}
              step="0.01"
              value={minimum}
              onChange={(event) =>
                setMinPrice(Number(event.target.value).toFixed(2))
              }
            />
            <input
              aria-label="Preço máximo em ETH"
              className="price-slider-max"
              type="range"
              min={minimum}
              max="12.3"
              step="0.01"
              value={maximum}
              onChange={(event) =>
                setMaxPrice(Number(event.target.value).toFixed(2))
              }
            />
          </div>
          <p className="price-summary">
            Preço: {minimum.toFixed(2).replace(".", ",")} -{" "}
            {maximum.toFixed(2).replace(".", ",")} ETH
          </p>
          <button
            type="button"
            className="button button-outline apply-price"
            onClick={() =>
              price.onApply({
                min: minPrice || undefined,
                max: maxPrice || undefined,
              })
            }
          >
            Aplicar
          </button>
        </div>
      )}
      {children}
    </>
  );

  // Desktop (e drawer fechado): aside comum. Aberto no mobile: diálogo modal do
  // Radix, que cuida de trap de foco, Escape, aria-hidden e retorno do foco.
  if (!open) {
    return (
      <aside id={id} ref={ref} className="filters">
        {body}
      </aside>
    );
  }
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        asChild
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          initialFocusRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          // O botão "Filtros" não é um Dialog.Trigger; devolve o foco a ele manualmente.
          event.preventDefault();
          document
            .querySelector<HTMLElement>(`[aria-controls="${id}"]`)
            ?.focus();
        }}
      >
        <aside id={id} ref={ref} className="filters filters-open">
          {/* span (não h2): o h2 visível "Filtros" já é o título da seção. */}
          <DialogTitle asChild>
            <span className="sr-only">{label}</span>
          </DialogTitle>
          {body}
        </aside>
      </DialogContent>
    </Dialog>
  );
}

/** Busca textual com debounce; o valor da URL continua sendo a fonte da verdade. */
function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: FilterSearch) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft.trim() === value.trim()) return;
    const timer = window.setTimeout(() => onChange(draft.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);
  return (
    <div className="filter-group filter-search">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </div>
  );
}

type SortOption = { value: string; label: string };

type FilterToolbarProps = {
  summary: ReactNode;
  controlsId: string;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  sort: {
    label: string;
    value: string;
    options: SortOption[];
    onChange: (value: string) => void;
  };
};

/** Barra acima dos resultados: contagem, botão de filtros (mobile) e ordenação. */
export function FilterToolbar({
  summary,
  controlsId,
  filtersOpen,
  onToggleFilters,
  sort,
}: FilterToolbarProps) {
  return (
    <div className="catalog-toolbar">
      <div className="result-count" role="status">
        {summary}
      </div>
      <div className="toolbar-actions">
        <button
          type="button"
          className="mobile-filter-button"
          aria-expanded={filtersOpen}
          aria-controls={controlsId}
          onClick={onToggleFilters}
        >
          ☷ FILTROS
        </button>
        <label className="sort-control">
          <span>ORDENAR POR</span>
          <select
            aria-label={sort.label}
            value={sort.value}
            onChange={(event) => sort.onChange(event.target.value)}
          >
            {sort.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

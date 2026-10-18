import { Toaster as Sonner } from "sonner";

/** Toasts com região aria-live para feedback de mutations e eventos em tempo real. */
export function Toaster() {
  return <Sonner theme="dark" position="bottom-right" richColors closeButton />;
}

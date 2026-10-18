import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Mensagem de erro do campo. Define aria-invalid e aria-describedby. */
  error?: string;
  /** Id do elemento que exibe `error`. Padrão: `${id}-error`. */
  errorId?: string;
}

/**
 * Input shadcn. Não impõe estilo: o visual vem das classes do projeto, para
 * preservar o layout do Figma. Acrescenta a semântica de erro acessível.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      error,
      errorId,
      id,
      "aria-describedby": describedBy,
      ...props
    },
    ref,
  ) => {
    const messageId = error
      ? (errorId ?? (id ? `${id}-error` : undefined))
      : undefined;
    const described =
      [describedBy, messageId].filter(Boolean).join(" ") || undefined;
    return (
      <input
        ref={ref}
        id={id}
        className={cn(className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

/** Mensagem de erro associada a um campo (ver `Input`). */
export function FieldError({
  id,
  children,
}: {
  id: string;
  children?: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <p id={id} className="auth-error field-error" role="alert">
      {children}
    </p>
  );
}

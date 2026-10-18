export interface ParsedApiError {
  code?: string;
  message?: string;
  fields: Record<string, string>;
}

/** Extrai código, mensagem e erros por campo do corpo de erro da API. */
export function parseApiError(err: unknown): ParsedApiError {
  const body = (
    err as {
      response?: {
        data?: {
          error?: {
            code?: string;
            message?: string;
            fields?: Record<string, string>;
          };
        };
      };
    }
  )?.response?.data?.error;
  return {
    code: body?.code,
    message: body?.message,
    fields: body?.fields ?? {},
  };
}

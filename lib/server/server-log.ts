import "server-only";

type ServerLogContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return { value: error };
}

export function logServerError(message: string, error: unknown, context?: ServerLogContext) {
  console.error("[server-error]", message, {
    ...context,
    error: serializeError(error),
  });
}

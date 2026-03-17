import { ZodError } from "zod";

import { AppError } from "@/lib/errors";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        message: "Validation failed",
        issues: error.issues.map((issue) => issue.message),
      },
      { status: 422 },
    );
  }

  if (error instanceof AppError) {
    return Response.json(
      {
        message: error.expose ? error.message : "Unexpected server error",
        issues: error.issues,
      },
      { status: error.statusCode },
    );
  }

  const statusCode =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number(error.statusCode)
      : 500;

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  } else {
    console.error("Unhandled API error", { statusCode, error: String(error) });
  }

  return Response.json({ message: "Unexpected server error" }, { status: statusCode });
}

export function withErrorHandler(
  handler: (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => Promise<Response>,
) {
  return async (request: Request, context: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

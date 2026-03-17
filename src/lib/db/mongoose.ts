import mongoose from "mongoose";

import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";

declare global {

  var __mongooseConnection:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const globalConnection = global.__mongooseConnection ?? {
  conn: null,
  promise: null,
};

global.__mongooseConnection = globalConnection;

export async function connectToDatabase() {
  if (globalConnection.conn) {
    return globalConnection.conn;
  }

  if (!globalConnection.promise) {
    globalConnection.promise = mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    globalConnection.conn = await globalConnection.promise;
    return globalConnection.conn;
  } catch (error) {
    globalConnection.promise = null;

    const message = error instanceof Error ? error.message : String(error);

    throw new AppError(
      "Database connection failed",
      503,
      true,
      [
        "Check MONGODB_URI on Vercel",
        "Check MongoDB Atlas Network Access allowlist",
        `Original error: ${message}`,
      ],
    );
  }
}

import { createClient } from "redis";

import { env } from "@/lib/env";

type CueeRedisClient = ReturnType<typeof createClient>;

declare global {
  var __cueeRedisClient: CueeRedisClient | undefined;
  var __cueeRedisPromise: Promise<CueeRedisClient> | undefined;
}

async function createRedisConnection() {
  const client = createClient({
    url: env.REDIS_URL,
    pingInterval: 30000,
  });

  client.on("error", (error) => {
    console.error("Redis connection error", error);
  });

  await client.connect();
  return client;
}

export async function connectToDatabase() {
  if (global.__cueeRedisClient?.isOpen) {
    return global.__cueeRedisClient;
  }

  if (!global.__cueeRedisPromise) {
    global.__cueeRedisPromise = createRedisConnection().then((client) => {
      global.__cueeRedisClient = client;
      return client;
    });
  }

  return global.__cueeRedisPromise as Promise<CueeRedisClient>;
}

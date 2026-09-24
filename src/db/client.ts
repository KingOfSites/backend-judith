import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  // Prisma error events can include query arguments (including private audit payloads).
  // Callers handle errors explicitly; do not dump their payloads to stdout.
  log: ["warn"],
});

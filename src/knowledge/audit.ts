import { prisma } from "../db/client.js";
import { Prisma } from "@prisma/client";
import { KnowledgeSearchError } from "./errors.js";

// No question, answer, profile or source content in stdout/application logs.
// Payload lives in the restricted DB, with source snapshots for historical reconstruction.
export async function writeAudit(id: string, payload: object, create = false) {
  try {
    const data = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
    if (create) await prisma.knowledgeInteraction.create({ data: { id, payload: data } });
    else await prisma.knowledgeInteraction.update({ where: { id }, data: { payload: data } });
  } catch { throw new KnowledgeSearchError("TRACE_UNAVAILABLE"); }
}

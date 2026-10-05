import { get, put } from "@vercel/blob";
import crypto from "node:crypto";
import type { HandoffPayload } from "./types";

const prefix = "handoffs/";

export async function saveHandoff(payload: HandoffPayload) {
  const id = crypto.randomBytes(12).toString("hex");
  const pathname = prefix + id + ".json";

  await put(pathname, JSON.stringify(payload), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  return id;
}

export async function loadHandoff(id: string): Promise<HandoffPayload | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;

  const result = await get(prefix + id + ".json", { access: "private" });
  if (!result || result.statusCode !== 200) return null;

  const response = new Response(result.stream);
  const text = await response.text();

  try {
    return JSON.parse(text) as HandoffPayload;
  } catch {
    return null;
  }
}

import { NextResponse } from "next/server";
import { saveHandoff } from "../../../lib/storage";
import type { HandoffPayload } from "../../../lib/types";

export const runtime = "nodejs";

function isValidPayload(value: unknown): value is HandoffPayload {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<HandoffPayload>;
  return (
    body.product === "AnnotationNav" &&
    typeof body.schemaVersion === "number" &&
    typeof body.pageName === "string" &&
    Array.isArray(body.annotations)
  );
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();

    if (!isValidPayload(payload)) {
      return NextResponse.json({ error: "Invalid AnnotationNav payload." }, { status: 400 });
    }

    const id = await saveHandoff(payload);
    const origin = new URL(request.url).origin;

    return NextResponse.json({
      id,
      url: origin + "/h/" + id,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create handoff." }, { status: 500 });
  }
}

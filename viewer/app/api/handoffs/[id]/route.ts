import { NextResponse } from "next/server";
import { loadHandoff } from "../../../../lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await loadHandoff(id);

  if (!payload) {
    return NextResponse.json({ error: "Handoff not found." }, { status: 404 });
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

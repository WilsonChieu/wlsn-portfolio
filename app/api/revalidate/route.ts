import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { bearerMatches } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  if (!secret) return NextResponse.json({ error: "Revalidation is not configured" }, { status: 500 });
  if (!(await bearerMatches(req.headers.get("authorization"), secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true });
}

import { readUsers } from "../../../db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ users: await readUsers() });
  } catch {
    return Response.json(
      { error: "User data is temporarily unavailable." },
      { status: 500 }
    );
  }
}

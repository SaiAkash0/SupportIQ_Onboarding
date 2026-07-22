import {
  clearSessionCookie,
  findUserById,
  getSessionUserId,
  serializeUser,
} from "../../../../db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = getSessionUserId(request);

    if (!userId) {
      return Response.json({ user: null });
    }

    const user = await findUserById(userId);

    return Response.json({ user: user ? serializeUser(user) : null });
  } catch {
    return Response.json(
      { error: "Saved onboarding progress could not be loaded." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}

import {
  readConfig,
  saveConfig,
  validateConfigPayload,
} from "../../../db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const components = await readConfig();
    return Response.json({ components });
  } catch {
    return Response.json(
      { error: "Configuration is temporarily unavailable." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const validation = validateConfigPayload(await request.json());
    if ("error" in validation) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const components = await saveConfig(validation.placements);
    return Response.json({ components });
  } catch {
    return Response.json(
      { error: "Configuration could not be saved." },
      { status: 500 }
    );
  }
}

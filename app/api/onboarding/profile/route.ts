import {
  findUserById,
  getSessionUserId,
  readConfig,
  serializeUser,
  updateUserProfile,
  type ComponentKey,
  type OnboardingPage,
} from "../../../../db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProfilePayload = {
  step?: number;
  fields?: {
    aboutMe?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
    birthdate?: string;
  };
};

export async function PATCH(request: Request) {
  try {
    const userId = getSessionUserId(request);

    if (!userId) {
      return Response.json(
        { error: "Submit your email and password before continuing." },
        { status: 401 }
      );
    }

    const payload = (await request.json()) as ProfilePayload;
    const step = payload.step === 2 || payload.step === 3 ? payload.step : null;
    const fields = payload.fields ?? {};

    if (!step) {
      return Response.json(
        { error: "A valid onboarding step is required." },
        { status: 400 }
      );
    }

    const config = await readConfig();
    const requiredComponents = config
      .filter((component) => component.page === step)
      .map((component) => component.key);
    const validationError = validateFields(requiredComponents, fields);

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const existing = await findUserById(userId);

    if (!existing) {
      return Response.json(
        { error: "Your saved onboarding session could not be found." },
        { status: 404 }
      );
    }

    const nextStep: OnboardingPage = step === 2 ? 3 : 3;
    const completed = step === 3;
    const cleaned = cleanFields(fields);

    const user = await updateUserProfile({
      userId,
      fields: cleaned,
      currentStep: nextStep,
      completed,
    });

    if (!user) {
      return Response.json(
        { error: "Your profile could not be loaded after saving." },
        { status: 500 }
      );
    }

    return Response.json({ user: serializeUser(user) });
  } catch {
    return Response.json(
      { error: "Profile details could not be saved." },
      { status: 500 }
    );
  }
}

function cleanFields(fields: NonNullable<ProfilePayload["fields"]>) {
  return {
    aboutMe: (fields.aboutMe ?? "").trim(),
    streetAddress: (fields.streetAddress ?? "").trim(),
    city: (fields.city ?? "").trim(),
    state: (fields.state ?? "").trim(),
    zip: (fields.zip ?? "").trim(),
    birthdate: (fields.birthdate ?? "").trim(),
  };
}

function validateFields(
  requiredComponents: ComponentKey[],
  fields: NonNullable<ProfilePayload["fields"]>
) {
  const cleaned = cleanFields(fields);

  if (requiredComponents.includes("aboutMe") && cleaned.aboutMe.length < 10) {
    return "Tell us a little more in About Me.";
  }

  if (requiredComponents.includes("address")) {
    if (
      !cleaned.streetAddress ||
      !cleaned.city ||
      !cleaned.state ||
      !cleaned.zip
    ) {
      return "Complete every address field before continuing.";
    }

    if (!/^[0-9A-Za-z -]{3,12}$/.test(cleaned.zip)) {
      return "Enter a valid ZIP or postal code.";
    }
  }

  if (requiredComponents.includes("birthdate")) {
    if (!cleaned.birthdate) {
      return "Choose a birthdate before continuing.";
    }

    const selected = new Date(`${cleaned.birthdate}T00:00:00`);
    const today = new Date();
    if (Number.isNaN(selected.getTime()) || selected > today) {
      return "Choose a birthdate that is not in the future.";
    }
  }

  return null;
}

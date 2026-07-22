import postgres from "postgres";

export const COMPONENT_DEFINITIONS = [
  {
    key: "aboutMe",
    label: "About Me",
    description: "A long-form introduction from the user.",
    defaultPage: 2,
    defaultSortOrder: 0,
  },
  {
    key: "address",
    label: "Address",
    description: "Street address, city, state, and ZIP code.",
    defaultPage: 3,
    defaultSortOrder: 0,
  },
  {
    key: "birthdate",
    label: "Birthdate",
    description: "A date picker for the user's birthdate.",
    defaultPage: 2,
    defaultSortOrder: 1,
  },
] as const;

export type ComponentKey = (typeof COMPONENT_DEFINITIONS)[number]["key"];
export type OnboardingPage = 2 | 3;

export type OnboardingConfigItem = {
  key: ComponentKey;
  label: string;
  description: string;
  page: OnboardingPage;
  sortOrder: number;
};

export type UserRecord = {
  id: string;
  email: string;
  aboutMe: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  birthdate: string;
  currentStep: OnboardingPage;
  completed: boolean;
  passwordStored: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  about_me: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  birthdate: string | null;
  current_step: number | null;
  completed: boolean | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ConfigPlacement = {
  key: ComponentKey;
  page: OnboardingPage;
  sortOrder: number;
};

type ConfigRow = {
  component_key: string;
  page: number;
  sort_order: number | null;
};

type ProfileFields = {
  aboutMe: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  birthdate: string;
};

let client: postgres.Sql | null = null;
let schemaReady: Promise<void> | null = null;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon Postgres connection string to the environment or your local .env.local file."
    );
  }

  client ??= postgres(databaseUrl, {
    max: 1,
    prepare: false,
  });

  return client;
}

export async function ensureDatabase() {
  schemaReady ??= createDatabaseShape().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

async function createDatabaseShape() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      about_me TEXT NOT NULL DEFAULT '',
      street_address TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      zip TEXT NOT NULL DEFAULT '',
      birthdate TEXT NOT NULL DEFAULT '',
      current_step INTEGER NOT NULL DEFAULT 2,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS users_created_at_idx
    ON users (created_at)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS onboarding_config (
      component_key TEXT PRIMARY KEY,
      page INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await Promise.all(
    COMPONENT_DEFINITIONS.map((component) =>
      sql`
        INSERT INTO onboarding_config (component_key, page, sort_order)
        VALUES (
          ${component.key},
          ${component.defaultPage},
          ${component.defaultSortOrder}
        )
        ON CONFLICT (component_key) DO NOTHING
      `
    )
  );
}

export async function readConfig(): Promise<OnboardingConfigItem[]> {
  await ensureDatabase();

  const sql = getSql();
  const rows = await sql<ConfigRow[]>`
    SELECT component_key, page, sort_order
    FROM onboarding_config
  `;

  return normalizeConfig(rows);
}

export async function saveConfig(placements: ConfigPlacement[]) {
  await ensureDatabase();

  const sql = getSql();
  await Promise.all(
    COMPONENT_DEFINITIONS.map((component) => {
      const placement = placements.find((item) => item.key === component.key);

      return sql`
        INSERT INTO onboarding_config (
          component_key,
          page,
          sort_order,
          updated_at
        )
        VALUES (
          ${component.key},
          ${placement?.page ?? component.defaultPage},
          ${placement?.sortOrder ?? component.defaultSortOrder},
          NOW()
        )
        ON CONFLICT (component_key) DO UPDATE SET
          page = EXCLUDED.page,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `;
    })
  );

  return readConfig();
}

export async function findUserByEmail(email: string) {
  await ensureDatabase();

  const sql = getSql();
  const rows = await sql<UserRow[]>`
    SELECT *
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  await ensureDatabase();

  const sql = getSql();
  const rows = await sql<UserRow[]>`
    SELECT *
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function createUser({
  id,
  email,
  passwordHash,
  passwordSalt,
}: {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  await ensureDatabase();

  const sql = getSql();
  await sql`
    INSERT INTO users (
      id,
      email,
      password_hash,
      password_salt,
      current_step,
      completed
    )
    VALUES (${id}, ${email}, ${passwordHash}, ${passwordSalt}, 2, FALSE)
  `;

  return findUserById(id);
}

export async function updateUserProfile({
  userId,
  fields,
  currentStep,
  completed,
}: {
  userId: string;
  fields: ProfileFields;
  currentStep: OnboardingPage;
  completed: boolean;
}) {
  await ensureDatabase();

  const sql = getSql();
  await sql`
    UPDATE users
    SET
      about_me = ${fields.aboutMe},
      street_address = ${fields.streetAddress},
      city = ${fields.city},
      state = ${fields.state},
      zip = ${fields.zip},
      birthdate = ${fields.birthdate},
      current_step = ${currentStep},
      completed = ${completed},
      updated_at = NOW()
    WHERE id = ${userId}
  `;

  return findUserById(userId);
}

export async function readUsers() {
  await ensureDatabase();

  const sql = getSql();
  const rows = await sql<UserRow[]>`
    SELECT *
    FROM users
    ORDER BY created_at DESC, email ASC
  `;

  return rows.map(serializeUser);
}

export function validateConfigPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { error: "Component configuration is required." } as const;
  }

  const rawComponents = (payload as { components?: unknown }).components;
  if (Array.isArray(rawComponents)) {
    const placements = [] as ConfigPlacement[];

    for (const component of COMPONENT_DEFINITIONS) {
      const rawComponent = rawComponents.find(
        (item) =>
          item &&
          typeof item === "object" &&
          (item as Record<string, unknown>).key === component.key
      );

      if (!rawComponent || typeof rawComponent !== "object") {
        return { error: `${component.label} is missing.` } as const;
      }

      const page = (rawComponent as Record<string, unknown>).page;
      const sortOrder = (rawComponent as Record<string, unknown>).sortOrder;

      if (page !== 2 && page !== 3) {
        return {
          error: `${component.label} must be assigned to page 2 or page 3.`,
        } as const;
      }

      placements.push({
        key: component.key,
        page,
        sortOrder:
          typeof sortOrder === "number" && Number.isInteger(sortOrder)
            ? sortOrder
            : component.defaultSortOrder,
      });
    }

    return validatePlacements(normalizePlacementOrders(placements));
  }

  return { error: "Component placements are required." } as const;
}

function validatePlacements(placements: ConfigPlacement[]) {
  const pageTwoCount = placements.filter((placement) => placement.page === 2).length;
  const pageThreeCount = placements.filter((placement) => placement.page === 3).length;

  if (pageTwoCount < 1 || pageThreeCount < 1) {
    return {
      error: "Pages 2 and 3 must each include at least one component.",
    } as const;
  }

  return { placements } as const;
}

export function serializeUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    aboutMe: row.about_me ?? "",
    streetAddress: row.street_address ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    zip: row.zip ?? "",
    birthdate: row.birthdate ?? "",
    currentStep: row.current_step === 3 ? 3 : 2,
    completed: Boolean(row.completed),
    passwordStored: Boolean(row.password_hash),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export function getSessionUserId(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const sessionCookie = cookies.find((cookie) =>
    cookie.startsWith("support_iq_user=")
  );

  return sessionCookie
    ? decodeURIComponent(sessionCookie.split("=").slice(1).join("="))
    : null;
}

export function createSessionCookie(request: Request, userId: string) {
  const isHttps = new URL(request.url).protocol === "https:";
  const secure = isHttps ? "; Secure" : "";
  return `support_iq_user=${encodeURIComponent(
    userId
  )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
}

export function clearSessionCookie() {
  return "support_iq_user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

function normalizeConfig(rows: ConfigRow[]) {
  const rowMap = new Map(rows.map((row) => [row.component_key, row]));
  const config = COMPONENT_DEFINITIONS.map((component) => ({
    key: component.key,
    label: component.label,
    description: component.description,
    page:
      rowMap.get(component.key)?.page === 2 || rowMap.get(component.key)?.page === 3
        ? (rowMap.get(component.key)?.page as OnboardingPage)
        : component.defaultPage,
    sortOrder:
      typeof rowMap.get(component.key)?.sort_order === "number"
        ? (rowMap.get(component.key)?.sort_order as number)
        : component.defaultSortOrder,
  }));

  const pageTwoCount = config.filter((component) => component.page === 2).length;
  const pageThreeCount = config.filter((component) => component.page === 3).length;

  if (pageTwoCount > 0 && pageThreeCount > 0) {
    return normalizePlacementOrders(config);
  }

  return normalizePlacementOrders(
    COMPONENT_DEFINITIONS.map((component) => ({
      key: component.key,
      label: component.label,
      description: component.description,
      page: component.defaultPage,
      sortOrder: component.defaultSortOrder,
    }))
  );
}

function normalizePlacementOrders<T extends ConfigPlacement>(placements: T[]) {
  return [2, 3].flatMap((page) =>
    placements
      .filter((placement) => placement.page === page)
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map((placement, index) => ({ ...placement, sortOrder: index }))
  ) as T[];
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

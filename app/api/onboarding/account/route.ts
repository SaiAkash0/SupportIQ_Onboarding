import {
  createSessionCookie,
  createUser,
  findUserByEmail,
  serializeUser,
} from "../../../../db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PASSWORD_ITERATIONS = 120_000;
const PASSWORD_HASH_BYTES = 32;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = payload.email?.trim().toLowerCase() ?? "";
    const password = payload.password ?? "";

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(email);

    if (existing) {
      const passwordMatches = await verifyPassword(
        password,
        existing.password_salt,
        existing.password_hash
      );

      if (!passwordMatches) {
        return Response.json(
          {
            error:
              "That email already exists. Enter its original password to continue.",
          },
          { status: 409 }
        );
      }

      const user = serializeUser(existing);
      const response = Response.json({ user });
      response.headers.append("Set-Cookie", createSessionCookie(request, user.id));
      return response;
    }

    const id = crypto.randomUUID();
    const passwordSalt = randomBase64(16);
    const passwordHash = await hashPassword(password, passwordSalt);

    const user = await createUser({
      id,
      email,
      passwordHash,
      passwordSalt,
    });

    if (!user) {
      return Response.json(
        { error: "The account could not be loaded after saving." },
        { status: 500 }
      );
    }

    const response = Response.json({ user: serializeUser(user) }, { status: 201 });
    response.headers.append("Set-Cookie", createSessionCookie(request, id));
    return response;
  } catch {
    return Response.json(
      { error: "Account details could not be saved." },
      { status: 500 }
    );
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function randomBase64(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

async function hashPassword(password: string, saltBase64: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(saltBase64),
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    PASSWORD_HASH_BYTES * 8
  );

  return bytesToBase64(new Uint8Array(bits));
}

async function verifyPassword(
  password: string,
  saltBase64: string,
  expectedHashBase64: string
) {
  const candidateHash = await hashPassword(password, saltBase64);
  const candidate = base64ToBytes(candidateHash);
  const expected = base64ToBytes(expectedHashBase64);
  let diff = candidate.length ^ expected.length;

  for (
    let index = 0;
    index < Math.max(candidate.length, expected.length);
    index += 1
  ) {
    diff |= (candidate[index] ?? 0) ^ (expected[index] ?? 0);
  }

  return diff === 0;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

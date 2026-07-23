import bcrypt from "bcryptjs";
import type { Document } from "mongodb";
import { getMongoDb } from "../mongodb";
import { uid } from "../store";
import type { SessionUser, UserRole } from "./session";

/** MongoDB `users` collection — registration and credential checks. */

export interface UserRecord extends SessionUser {
  passwordHash: string;
  createdAt: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const mongo = await getMongoDb();
  return mongo
    .collection("users")
    .findOne({ email: normalizeEmail(email) }, { projection: { _id: 0 } }) as Promise<UserRecord | null>;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<UserRecord> {
  const mongo = await getMongoDb();
  const user: UserRecord = {
    id: uid("u"),
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    role: input.role,
    passwordHash: await bcrypt.hash(input.password, 10),
    createdAt: new Date().toISOString(),
  };
  await mongo.collection("users").insertOne({ ...user } as Document);
  return user;
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<UserRecord | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export function toSessionUser(user: UserRecord): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

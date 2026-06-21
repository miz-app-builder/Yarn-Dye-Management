import { type Request, type Response, type NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { db, usersTable } from "@workspace/db";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      role: string;
    }

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

async function upsertUser(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const meta = (supabaseUser.user_metadata as Record<string, string>) || {};
  const fullName = meta.full_name || meta.name || "";
  const parts = fullName.split(" ");
  const first = parts[0] || "";
  const last = parts.slice(1).join(" ") || "";

  const userData = {
    id: supabaseUser.id,
    email: supabaseUser.email || null,
    firstName: meta.first_name || first || null,
    lastName: meta.last_name || last || null,
    profileImageUrl: meta.avatar_url || null,
  };

  try {
    const [user] = await db
      .insert(usersTable)
      .values(userData)
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  } catch {
    // Email unique constraint conflict — look up the existing user by email
    const { eq } = await import("drizzle-orm");
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, userData.email!));
    if (existing) return existing;
    throw new Error("Failed to upsert user");
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      next();
      return;
    }

    const dbUser = await upsertUser(user as Parameters<typeof upsertUser>[0]);
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      role: dbUser.role,
    };
  } catch (err) {
    req.log?.error({ err }, "Auth middleware error");
  }

  next();
}

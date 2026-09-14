import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const MEMBER_SESSION_COOKIE = "tatil_member_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateMemberSessionToken() {
  return randomBytes(32).toString("hex");
}

export async function createMemberSession(memberId: string) {
  const token = generateMemberSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.memberSession.create({
    data: {
      memberId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(MEMBER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearMemberSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (token) {
    await prisma.memberSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }
  cookieStore.delete(MEMBER_SESSION_COOKIE);
}

export async function getCurrentMember() {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.memberSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
    include: {
      member: {
        include: {
          customer: true,
        },
      },
    },
  });

  if (!session?.member?.active) return null;

  await prisma.memberSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });

  return session.member;
}

import { cookies, headers } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "./prisma";
import { getJwtSecret } from "./jwt";

export { getJwtSecret };

export async function getUser(): Promise<{
  id: string;
  username: string;
  role: string;
  isApiKey?: boolean;
} | null> {
  const cookieStore = await cookies();
  let token = cookieStore.get("vortx_session")?.value;
  let isFromHeader = false;

  if (!token) {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
      isFromHeader = true;
    } else if (authHeader) {
      token = authHeader.trim();
      isFromHeader = true;
    }
  }

  if (!token) return null;

  // 1. Try JWT verification (standard web session)
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      id: payload.sub as string,
      username: payload.username as string,
      role: payload.role as string,
      isApiKey: false,
    };
  } catch (jwtErr) {
    // 2. If JWT fails and it came from Authorization header, check database API Keys
    if (isFromHeader) {
      try {
        const apiKey = await prisma.api_keys.findUnique({
          where: { key: token, is_active: true },
          include: { profile: true },
        });

        if (apiKey && apiKey.profile) {
          // Update last_used timestamp asynchronously
          prisma.api_keys
            .update({
              where: { id: apiKey.id },
              data: { last_used: new Date() },
            })
            .catch(() => {});

          return {
            id: apiKey.user_id,
            username: apiKey.profile.username,
            role: apiKey.profile.role,
            isApiKey: true,
          };
        }
      } catch (dbErr) {
        console.error("API Key verification error:", dbErr);
      }
    }
    return null;
  }
}

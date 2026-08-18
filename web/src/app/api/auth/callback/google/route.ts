import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/utils/prisma";
import { SignJWT } from "jose";
import { getJwtSecret } from "@/utils/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    console.warn("Google OAuth error from provider:", errorParam);
    return NextResponse.redirect(new URL("/login?error=google_auth_cancelled", origin));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=missing_oauth_params", origin));
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;

  if (!savedState || savedState !== state) {
    console.error("Google OAuth state mismatch or expired.");
    return NextResponse.redirect(new URL("/login?error=invalid_oauth_state", origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured.");
    return NextResponse.redirect(new URL("/login?error=google_not_configured", origin));
  }

  const redirectUri = `${origin}/api/auth/callback/google`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.text();
      console.error("Token exchange failed with Google:", errorData);
      return NextResponse.redirect(new URL("/login?error=google_token_failed", origin));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch User Profile Info from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error("Failed to fetch Google user info.");
      return NextResponse.redirect(new URL("/login?error=google_user_failed", origin));
    }

    const googleUser = (await userRes.json()) as {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };

    if (!googleUser.email) {
      return NextResponse.redirect(new URL("/login?error=google_email_missing", origin));
    }

    // 3. Find or Create User in Database
    let user = await prisma.profiles.findFirst({
      where: {
        OR: [
          { google_id: googleUser.id },
          { email: googleUser.email },
        ],
      },
    });

    if (user) {
      // User exists -> update google_id and avatar_url if missing
      const updateData: { google_id?: string; avatar_url?: string; email?: string } = {};
      if (!user.google_id) updateData.google_id = googleUser.id;
      if (!user.email) updateData.email = googleUser.email;
      if (googleUser.picture && (!user.avatar_url || user.avatar_url !== googleUser.picture)) {
        updateData.avatar_url = googleUser.picture;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.profiles.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    } else {
      // User does not exist -> create new user
      const userCount = await prisma.profiles.count();
      const role = userCount === 0 ? "admin" : "user";

      // Generate a unique, clean username
      const rawBase = (googleUser.name || googleUser.email.split("@")[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");
      let usernameCandidate = rawBase.length >= 3 ? rawBase : `user_${googleUser.id.slice(0, 6)}`;

      // Ensure uniqueness
      let exists = await prisma.profiles.findUnique({ where: { username: usernameCandidate } });
      if (exists) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        usernameCandidate = `${usernameCandidate.slice(0, 15)}_${randomSuffix}`;
      }

      user = await prisma.profiles.create({
        data: {
          username: usernameCandidate,
          email: googleUser.email,
          google_id: googleUser.id,
          avatar_url: googleUser.picture || null,
          role,
          vcoin_balance: 0,
        },
      });
    }

    // 4. Create VortX session JWT
    const token = await new SignJWT({
      sub: user.id,
      username: user.username,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(getJwtSecret());

    // 5. Build Redirect response
    const targetPath = user.role === "admin" ? "/admin" : "/dashboard";
    const response = NextResponse.redirect(new URL(targetPath, origin));

    response.cookies.set("vortx_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "lax",
    });

    // Clear the OAuth state cookie
    response.cookies.set("google_oauth_state", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Google Auth Callback Exception:", err);
    return NextResponse.redirect(new URL("/login?error=google_auth_exception", origin));
  }
}

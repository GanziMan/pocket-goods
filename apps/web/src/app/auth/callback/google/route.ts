import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const next = state ? decodeURIComponent(state) : "/design";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Google Token Endpoint에서 code → id_token 교환
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/auth/callback/google`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.id_token) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Supabase에 id_token으로 세션 생성
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: tokenData.id_token,
  });

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

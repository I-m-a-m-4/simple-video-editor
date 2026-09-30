import { createAuthClient } from "better-auth/react";
import { webEnv } from "@/env/web";

export const authClient = createAuthClient({
	baseURL: webEnv.NEXT_PUBLIC_SITE_URL,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

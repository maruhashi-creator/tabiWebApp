import { withAuth } from "next-auth/middleware";

// Send unauthenticated users straight to our /login (with a relative callbackUrl),
// instead of next-auth's default /api/auth/signin two-step redirect.
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  // Protect everything except auth/public assets, so newly added pages are guarded by default.
  matcher: ["/((?!api|login|_next/static|_next/image|.*\\.png$|manifest\\.json$).*)"],
};

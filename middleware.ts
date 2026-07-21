export { default } from "next-auth/middleware";

export const config = {
  // Protect everything except auth/public assets, so newly added pages are guarded by default.
  matcher: ["/((?!api|login|_next/static|_next/image|.*\\.png$|manifest\\.json$).*)"],
};

export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/", "/feeding/:path*", "/toilet/:path*", "/weight/:path*", "/settings/:path*"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TODO(auth): Replace this stub with real auth (NextAuth.js, Clerk, etc.)
// Example with NextAuth:
//   import { withAuth } from "next-auth/middleware";
//   export default withAuth({ pages: { signIn: "/login" } });
//   export const config = { matcher: ["/invoices", "/nda", "/legal", "/api/:path*"] };

export function middleware(_request: NextRequest) {
  // Auth is disabled in MVP — all routes are public
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

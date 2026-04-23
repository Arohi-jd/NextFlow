import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isDevelopmentAuthBypassEnabled } from "@/lib/auth";

const isProtectedRoute = createRouteMatcher(["/workflow(.*)"]);

export default clerkMiddleware((auth, request) => {
  if (isDevelopmentAuthBypassEnabled()) {
    return;
  }

  if (isProtectedRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/(api|trpc)(.*)", "/((?!_next|.*\\..*).*)"]
};

import { Route, Routes } from "react-router-dom";

import { AccountPage } from "@/pages/account";
import { LoginPage } from "@/pages/login";
import { SessionsPage } from "@/pages/sessions";
import { SessionDetailPage } from "@/pages/sessions/[id]";
import { SettingsPage } from "@/pages/settings";

import { AuthRoute } from "./auth-route";
import { GuestRoute } from "./guest-route";

const publicRoutes = [
  {
    path: "/login",
    element: <LoginPage />,
  },
] as const;

const authRoutes = [
  {
    path: "/",
    element: <SessionsPage />,
  },
  {
    path: "/sessions",
    element: <SessionsPage />,
  },
  {
    path: "/sessions/:id",
    element: <SessionDetailPage />,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
  },
  {
    path: "/account",
    element: <AccountPage />,
  },
] as const;

export function AppRoutes() {
  return (
    <Routes>
      {/* Guest routes, cannot access when auth */}
      {publicRoutes.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={<GuestRoute>{element}</GuestRoute>}
        />
      ))}

      {/* Auth routes, cannot access when no auth */}
      {authRoutes.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={<AuthRoute>{element}</AuthRoute>}
        />
      ))}
    </Routes>
  );
}

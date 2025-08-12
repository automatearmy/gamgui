import { Route, Routes } from "react-router-dom";

import { AccountPage } from "@/pages/account";
import { LoginPage } from "@/pages/login";
import { SessionsPage } from "@/pages/sessions";
import { SessionConnectPage } from "@/pages/sessions/[id]/connect";
import { SessionLogsPage } from "@/pages/sessions/[id]/logs";
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
    path: "/sessions/:id/connect",
    element: <SessionConnectPage />,
  },
  {
    path: "/sessions/:id/logs",
    element: <SessionLogsPage />,
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

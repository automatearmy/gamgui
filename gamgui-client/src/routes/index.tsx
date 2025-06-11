import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AccountPage } from "@/pages/account";
import { DashboardPage } from "@/pages/dashboard";
import { LoginPage } from "@/pages/login";
import { SessionsPage } from "@/pages/sessions";
import { SessionDetailPage } from "@/pages/sessions/[id]";
import { SettingsPage } from "@/pages/settings";

const publicRoutes = [
  {
    path: "/login",
    element: <LoginPage />,
  },
] as const;

const protectedRoutes = [
  {
    path: "/",
    element: <DashboardPage />,
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
      {publicRoutes.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}

      {protectedRoutes.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={<ProtectedRoute>{element}</ProtectedRoute>}
        />
      ))}
    </Routes>
  );
}

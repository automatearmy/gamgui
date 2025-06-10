import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { LoginPage } from "@/pages/auth/login";
import { DashboardPage } from "@/pages/dashboard";
import { SessionsPage } from "@/pages/sessions";
import { SessionDetailPage } from "@/pages/sessions/[id]";

const publicRoutes = [
  {
    path: "/auth/login",
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

import { Navigate, Outlet } from "react-router-dom";
import { getSession } from "../lib/auth";

export default function ProtectedRoute() {
  const session = getSession();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import Tenants from "./pages/Tenants";
import Departments from "./pages/Departments";
import Designations from "./pages/Designations";
import Sessions from "./pages/Sessions";
import AuditLogs from "./pages/AuditLogs";
import Modules from "./pages/Modules";
import ModulePage from "./pages/ModulePage";
import AccessTester from "./pages/AccessTester";
import UserAccess from "./pages/UserAccess";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="roles" element={<Roles />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="departments" element={<Departments />} />
            <Route path="designations" element={<Designations />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="Modules" element={<Modules />} />
            <Route path="apps/:moduleId" element={<ModulePage />} />
            <Route path="access-tester" element={<AccessTester />} />
            <Route path="user-access" element={<UserAccess />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

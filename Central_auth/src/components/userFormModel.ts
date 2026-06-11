import type { UserListItem } from "../lib/api";

export interface UserFormValues {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  password: string;
  newPassword: string;
  phoneNumber: string;
  tenantId: string;
  departmentId: string;
  designationId: string;
  isActive: boolean;
  roleIds: number[];
}

export const emptyUserForm: UserFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  userName: "",
  password: "",
  newPassword: "",
  phoneNumber: "",
  tenantId: "",
  departmentId: "",
  designationId: "",
  isActive: true,
  roleIds: [],
};

export function buildInitialValues(
  user: UserListItem | null,
): UserFormValues {
  if (!user) return { ...emptyUserForm };
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userName: user.userName,
    password: "",
    newPassword: "",
    phoneNumber: user.phoneNumber ?? "",
    tenantId: user.tenantId ? String(user.tenantId) : "",
    departmentId: user.departmentId ? String(user.departmentId) : "",
    designationId: user.designationId ? String(user.designationId) : "",
    isActive: user.isActive,
    roleIds: [],
  };
}

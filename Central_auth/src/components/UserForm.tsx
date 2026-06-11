import { useState, type ChangeEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import type {
  TenantListItem,
  DepartmentItem,
  DesignationItem,
  UserListItem,
} from "../lib/api";
import {
  buildInitialValues,
  type UserFormValues,
} from "./userFormModel";

interface UserFormProps {
  initialData: UserListItem | null;
  tenants: TenantListItem[];
  departments: DepartmentItem[];
  designations: DesignationItem[];
  saving: boolean;
  formError: string | null;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

export default function UserForm({
  initialData,
  tenants,
  departments,
  designations,
  saving,
  formError,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const isEdit = Boolean(initialData);
  const [values, setValues] = useState<UserFormValues>(() =>
    buildInitialValues(initialData),
  );
  const [showPwd, setShowPwd] = useState(false);

  const set = <K extends keyof UserFormValues>(key: K, v: UserFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const isValid =
    !!values.firstName.trim() &&
    !!values.lastName.trim() &&
    !!values.departmentId &&
    !!values.designationId &&
    (isEdit || (!!values.email && !!values.userName && !!values.password));

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {formError && (
        <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FieldText label="First Name *" value={values.firstName} onChange={(v) => set("firstName", v)} placeholder="John" />
        <FieldText label="Last Name *" value={values.lastName} onChange={(v) => set("lastName", v)} placeholder="Doe" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldText
          label="Email *"
          type="email"
          value={values.email}
          onChange={(v) => set("email", v)}
          placeholder="john@example.com"
          readOnly={isEdit}
        />
        <FieldText
          label="Username *"
          value={values.userName}
          onChange={(v) => set("userName", v)}
          placeholder="john.doe"
          readOnly={isEdit}
        />
      </div>

      <FieldText
        label="Phone"
        type="tel"
        value={values.phoneNumber}
        onChange={(v) => set("phoneNumber", v)}
        placeholder="+880 1700 000000"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Tenant</label>
          <select
            value={values.tenantId}
            onChange={(e) => set("tenantId", e.target.value)}
            className={inputCls}
          >
            <option value="">No tenant</option>
            {tenants.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Department *</label>
          <select
            value={values.departmentId}
            onChange={(e) => set("departmentId", e.target.value)}
            className={inputCls}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Designation *</label>
          <select
            value={values.designationId}
            onChange={(e) => set("designationId", e.target.value)}
            className={inputCls}
          >
            <option value="">Select designation</option>
            {designations.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isEdit ? (
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Password *</label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Min 8 characters"
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            New Password <span className="text-muted-foreground">(leave blank to keep current)</span>
          </label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={values.newPassword}
              onChange={(e) => set("newPassword", e.target.value)}
              placeholder="Min 8 characters"
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {isEdit && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 rounded border bg-background accent-primary"
          />
          Is Active
        </label>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !isValid}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isEdit ? "Save Changes" : "Create User"}
        </button>
      </div>
    </form>
  );
}

interface FieldTextProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}

function FieldText({ label, value, onChange, placeholder, type = "text", readOnly }: FieldTextProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`${inputCls} ${readOnly ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
      />
    </div>
  );
}

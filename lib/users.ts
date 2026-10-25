export const USER_ROLES = ["student", "tutor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
    student: "Student",
    tutor: "Tutor",
    admin: "Admin",
};

export function isUserRole(value: unknown): value is UserRole {
    return USER_ROLES.includes(value as UserRole);
}

export const MIN_PASSWORD_LENGTH = 8; // better-auth default

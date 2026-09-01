export const ROLES = {
  SUPER_ADMIN: "super_admin",
  SCHOOL_ADMIN: "school_admin",
  TEACHER: "teacher",
  CASHIER: "cashier",
  PARENT: "parent",
  STUDENT: "student",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.SCHOOL_ADMIN]: "Direction",
  [ROLES.TEACHER]: "Enseignant",
  [ROLES.CASHIER]: "Caissier",
  [ROLES.PARENT]: "Parent",
  [ROLES.STUDENT]: "Élève",
};

// Home route each role lands on after selecting a school.
export const ROLE_HOME_PATH = {
  [ROLES.SUPER_ADMIN]: "/admin",
  [ROLES.SCHOOL_ADMIN]: "/dashboard",
  [ROLES.TEACHER]: "/dashboard",
  [ROLES.CASHIER]: "/caisse",
  [ROLES.PARENT]: "/dashboard",
  [ROLES.STUDENT]: "/dashboard",
};

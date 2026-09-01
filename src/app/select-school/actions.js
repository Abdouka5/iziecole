"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SCHOOL_COOKIE } from "@/lib/school-context";
import { ROLE_HOME_PATH } from "@/lib/roles";

export async function selectSchool(schoolId, role) {
  const cookieStore = await cookies();
  cookieStore.set(SCHOOL_COOKIE, schoolId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(ROLE_HOME_PATH[role] ?? "/dashboard");
}

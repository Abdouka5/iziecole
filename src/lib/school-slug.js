export function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Needs the service-role client: RLS normally hides other schools from
// whoever is creating this one (a brand-new self-signup user has no
// membership yet to see other rows through).
export async function uniqueSlug(admin, baseSlug) {
  let slug = baseSlug || "ecole";
  let suffix = 1;
  while (true) {
    const { data } = await admin.from("schools").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

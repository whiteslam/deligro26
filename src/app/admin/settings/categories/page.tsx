import { redirect } from "next/navigation";

/** Old URL — category pictures now live under Admin → Storage. */
export default function CategoryPicturesRedirect() {
  redirect("/admin/storage?tab=categories");
}

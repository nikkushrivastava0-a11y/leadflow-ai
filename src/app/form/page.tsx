import { redirect } from "next/navigation";

/**
 * A client slug exists only on /form/[slug].
 * Never render the dynamic form directly at /form: its params.slug is undefined.
 */
export default function FormIndex() {
  redirect("/");
}

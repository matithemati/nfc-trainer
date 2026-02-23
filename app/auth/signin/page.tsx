// Redirect from old /auth/signin to /pl/auth/signin
import { redirect } from "next/navigation";

export default function SignInRedirect() {
  redirect("/pl/auth/signin");
}

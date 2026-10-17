import { PageShell } from "@/components/portal/page-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <PageShell title="Login" crumbs={[{ label: "Home", href: "/" }, { label: "Login" }]}>
      <LoginForm />
    </PageShell>
  );
}

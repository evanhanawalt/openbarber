import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

type Props = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const error =
    params.error === "AccessDenied"
      ? "That Google account is not on the admin allowlist."
      : params.error
        ? "Sign-in failed. Try again."
        : null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">
        Admin
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-walnut">
        Sign in
      </h1>
      <p className="mt-3 text-muted">
        Google OAuth is limited to the barber&apos;s allowlisted email.
      </p>

      {error ? (
        <p className="mt-4 border border-copper/40 bg-paper px-3 py-2 text-sm text-copper-deep">
          {error}
        </p>
      ) : null}

      <form
        className="mt-8"
        action={async () => {
          "use server";
          try {
            await signIn("google", {
              redirectTo: params.callbackUrl || "/admin",
            });
          } catch (err) {
            if (err instanceof AuthError) {
              redirect(`/admin/login?error=${err.type}`);
            }
            throw err;
          }
        }}
      >
        <button
          type="submit"
          className="w-full bg-walnut px-5 py-3 text-sm font-semibold uppercase tracking-wider text-cream hover:bg-ink"
        >
          Continue with Google
        </button>
      </form>

      <a href="/" className="mt-6 text-sm text-muted hover:text-walnut">
        ← Back to public page
      </a>
    </div>
  );
}

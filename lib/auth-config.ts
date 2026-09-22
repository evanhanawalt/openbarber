export function getAuthEnv() {
  const secret = process.env.AUTH_SECRET;
  const googleId = process.env.AUTH_GOOGLE_ID;
  const googleSecret = process.env.AUTH_GOOGLE_SECRET;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!secret || !googleId || !googleSecret || !adminEmail) {
    throw new Error(
      "Missing AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, or ADMIN_EMAIL",
    );
  }

  return {
    secret,
    googleId,
    googleSecret,
    adminEmails: adminEmail
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  };
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAuthEnv().adminEmails.includes(email.toLowerCase());
}

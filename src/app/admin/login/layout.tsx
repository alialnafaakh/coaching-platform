// The login page needs its OWN layout so it doesn't inherit
// the auth-guarded admin layout (which would cause a redirect loop).
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

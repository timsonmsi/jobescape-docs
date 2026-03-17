export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // Login page renders full-screen, bypassing the main app shell's padding
  return <>{children}</>;
}

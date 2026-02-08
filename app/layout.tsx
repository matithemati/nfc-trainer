// Root layout - just pass through children
// The actual html/body is handled by app/[lang]/layout.tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

// Root layout - provides html/body tags for all routes
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-100" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

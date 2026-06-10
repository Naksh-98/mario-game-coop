import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Super Mario Co-op Adventure",
  description: "A 2-player co-op Mario platformer with level editor and in-game video calls",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mario Co-op",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#d50000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* iOS home-screen app support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#000' }}>
        {children}
        {/* Register the service worker so the app is installable */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

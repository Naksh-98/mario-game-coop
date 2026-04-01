export const metadata = {
  title: "Mini Retro Runner",
  description: "A simple coop game built with Phaser",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#000' }}>
        {children}
      </body>
    </html>
  );
}

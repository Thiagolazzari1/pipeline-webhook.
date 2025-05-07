import "./globals.css";

export const metadata = {
  title: "Pipeline Webhook",
  description: "Webhook para atualização do CRM Pipedrive",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

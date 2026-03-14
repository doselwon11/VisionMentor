import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "VisionMentor",
  description: "AI tutor for homework help",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

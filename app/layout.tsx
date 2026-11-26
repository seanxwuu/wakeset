import type { Metadata, Viewport } from "next";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "./globals.css";
import { BoardProvider } from "@/components/board";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "WakeSet",
  description: "Build your own weekly workout routine and tick it off as you train.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#1A211E" }, { color: "#F2F4F6" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BoardProvider>
          <div className="wrap">
            <Nav />
            {children}
          </div>
        </BoardProvider>
      </body>
    </html>
  );
}

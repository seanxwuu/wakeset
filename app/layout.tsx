import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BoardProvider } from "@/components/board";
import { Nav } from "@/components/Nav";
import { SpotterPanel, SpotterProvider } from "@/components/spotter";

export const metadata: Metadata = {
  title: "WakeSet",
  description: "Build your own weekly workout routine and tick it off as you train.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0a0c0f" }, { color: "#fbfaf7" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BoardProvider>
          <SpotterProvider>
            <div className="shell">
              <Nav />
              <main className="main">{children}</main>
            </div>
            <SpotterPanel />
          </SpotterProvider>
        </BoardProvider>
      </body>
    </html>
  );
}

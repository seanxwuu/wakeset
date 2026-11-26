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

// Sets the theme before the page paints, so a dark-mode user never sees a white flash.
// "system" (or nothing saved) leaves the attribute off and the device setting decides.
const THEME_SCRIPT = `try{var t=localStorage.getItem("wakeset-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
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

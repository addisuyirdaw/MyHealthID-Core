import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { FloatingChatBot } from "@/components/ai/floating-chat-bot";
import { ChatProvider } from "@/components/ai/chat-context";
import { LanguageProvider } from "@/components/LanguageProvider";
import { cookies } from "next/headers";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MyHealthID - National Digital Health ID",
  description: "Secure, verified national digital health identification for every Ethiopian citizen.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const showSidebar = !!userRole;

  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <ChatProvider>
            {showSidebar ? (
              <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 overflow-x-hidden relative">
                  {children}
                </div>
              </div>
            ) : (
              <div className="min-h-screen overflow-x-hidden relative">
                {children}
              </div>
            )}
            {showSidebar && <FloatingChatBot />}
          </ChatProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

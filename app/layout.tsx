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
  title: "MyHealthID - Patient Registration",
  description: "Modern Health Information System Registration",
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

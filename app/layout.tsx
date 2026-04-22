import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { ChatBot } from "@/components/ChatBot";


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
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden relative">
            {children}
          </div>
        </div>
        <ChatBot />
      </body>

    </html>
  );
}

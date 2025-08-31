import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth-context";
import Navbar from "./components/Navbar";
import AutoCleanup from "./components/AutoCleanup";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Eventium",
  description: "Discover and create amazing events",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AutoCleanup />
          <Navbar />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}

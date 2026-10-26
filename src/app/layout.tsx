import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import React, { Suspense } from "react";
import BottomNavBar from "@/components/BottomNavBar";
import NativeAppBridge from "@/components/NativeAppBridge";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "REGASCO Mindanao Ave. — Official LPG Ordering & Fast Delivery",
  description:
    "Order authentic Regasco 11kg, Supreme Kalan (SK), 5kg, 22kg, and 50kg cooking gas. Fast doorstep delivery in Mindanao Ave. & Quezon City. COD and GCash QR accepted.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/images/regasco-11kg.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Regasco LPG",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FF5A00",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white">
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={null}>
              <NativeAppBridge />
            </Suspense>
            {children}
            <Suspense fallback={null}>
              <BottomNavBar />
            </Suspense>
            <AuthModal />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

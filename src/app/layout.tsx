import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ADSENSE_PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || "";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

export const metadata: Metadata = {
  title: {
    default: "PetrolSaver — Cheapest Fuel Prices in Victoria",
    template: "%s | PetrolSaver",
  },
  description:
    "Find the cheapest petrol, diesel, and LPG prices near you in Victoria, Australia. Compare 1,600+ fuel stations on an interactive map with real-time pricing.",
  keywords: [
    "petrol prices",
    "fuel prices",
    "cheap petrol",
    "cheap fuel",
    "Victoria fuel prices",
    "Melbourne petrol prices",
    "diesel prices",
    "LPG prices",
    "servo prices",
    "fuel comparison",
    "petrol comparison",
    "cheapest petrol near me",
    "fuel price map",
    "petrol station finder",
    "PetrolSaver",
  ],
  authors: [{ name: "PetrolSaver" }],
  creator: "PetrolSaver",
  publisher: "PetrolSaver",
  metadataBase: new URL("https://petrolsaver.live"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://petrolsaver.live",
    siteName: "PetrolSaver",
    title: "PetrolSaver — Cheapest Fuel Prices in Victoria",
    description:
      "Compare fuel prices across 1,600+ stations in Victoria, Australia. Find the cheapest petrol, diesel, and LPG near you on an interactive map.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PetrolSaver — Cheapest Fuel Prices in Victoria",
    description:
      "Compare fuel prices across 1,600+ stations in Victoria. Find cheap petrol near you.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="google-adsense-account" content="ca-pub-4918791662575228" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PetrolSaver",
              url: "https://petrolsaver.live",
              description:
                "Compare fuel prices across 1,600+ stations in Victoria, Australia. Find the cheapest petrol, diesel, and LPG near you.",
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "AUD",
              },
              author: {
                "@type": "Organization",
                name: "PetrolSaver",
              },
              areaServed: {
                "@type": "State",
                name: "Victoria",
                containedInPlace: {
                  "@type": "Country",
                  name: "Australia",
                },
              },
            }),
          }}
        />
        {ADSENSE_PUB_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col h-screen overflow-hidden md:overflow-auto md:min-h-screen md:h-auto`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

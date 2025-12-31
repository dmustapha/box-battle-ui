import type React from "react"
import type { Metadata } from "next"
import { Outfit, Space_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import { ErrorBoundary } from "@/components/error-boundary"
import "./globals.css"
import "@/styles/design-tokens.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "BoxBattle ⚡ - Web3 Strategy Game",
  description:
    "Experience the ultimate competitive Dots and Boxes game with real-time multiplayer and blockchain rewards on Mantle Sepolia",
  generator: "v0.app",
  icons: {
    icon: '/boxbattle-logo.svg',
    apple: '/boxbattle-logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Aggressive error suppression for browser extension conflicts
              (function() {
                // Protect Object.defineProperty
                const originalDefineProperty = Object.defineProperty;
                Object.defineProperty = function(obj, prop, descriptor) {
                  try {
                    return originalDefineProperty(obj, prop, descriptor);
                  } catch (e) {
                    // Silently fail if extensions conflict
                    return obj;
                  }
                };

                // Suppress console errors
                const originalError = console.error;
                const originalWarn = console.warn;
                console.error = function(...args) {
                  const message = args.join(' ');
                  if (
                    message.includes('chrome-extension://') ||
                    message.includes('chrome.runtime') ||
                    message.includes('Extension ID') ||
                    message.includes('ethereum') ||
                    message.includes('Cannot set property') ||
                    message.includes('Invalid property descriptor') ||
                    message.includes('defineProperty')
                  ) {
                    return;
                  }
                  originalError.apply(console, args);
                };
                console.warn = function(...args) {
                  const message = args.join(' ');
                  if (
                    message.includes('chrome-extension://') ||
                    message.includes('ethereum')
                  ) {
                    return;
                  }
                  originalWarn.apply(console, args);
                };

                // Catch all errors
                window.addEventListener('error', function(e) {
                  const msg = e.message || '';
                  if (
                    msg.includes('chrome.runtime') ||
                    msg.includes('chrome-extension://') ||
                    msg.includes('Extension ID') ||
                    msg.includes('ethereum') ||
                    msg.includes('Cannot set property') ||
                    msg.includes('Invalid property descriptor') ||
                    msg.includes('defineProperty')
                  ) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return false;
                  }
                }, true);

                // Suppress unhandled promise rejections
                window.addEventListener('unhandledrejection', function(e) {
                  const message = e.reason?.message || e.reason || '';
                  const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
                  if (
                    msgStr.includes('chrome.runtime') ||
                    msgStr.includes('chrome-extension://') ||
                    msgStr.includes('ethereum') ||
                    msgStr.includes('Cannot set property') ||
                    msgStr.includes('Invalid property descriptor')
                  ) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return false;
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className={`${outfit.variable} ${spaceMono.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}

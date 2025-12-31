import Navigation from "@/components/landing/navigation"
import Hero from "@/components/landing/hero"
import Features from "@/components/landing/features"
import HowToPlay from "@/components/landing/how-to-play"
import Stats from "@/components/landing/stats"
import CTA from "@/components/landing/cta"
import Footer from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen relative z-10">
      <Navigation />
      <Hero />
      <Features />
      <HowToPlay />
      <Stats />
      <CTA />
      <Footer />
    </div>
  )
}

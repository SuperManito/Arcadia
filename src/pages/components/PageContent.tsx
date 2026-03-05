import React from 'react'
import HeroSection from './Hero'
import PreviewSection from './Preview'
import ScrollFeaturesSection from './ScrollFeatures'
import LanguageShowcase from './LanguageShowcase'
import EcosystemSection from './Ecosystem'
import Footer from './Footer'

export default function HomePageContent () {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-neutral-950">
      <HeroSection />
      <PreviewSection />
      <LanguageShowcase />
      <ScrollFeaturesSection />
      <EcosystemSection />
      <Footer />
    </div>
  )
}

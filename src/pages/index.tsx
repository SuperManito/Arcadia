import React, { useMemo } from 'react'
import Layout from '@theme/Layout'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import { useWindowSize } from '@docusaurus/theme-common'
import Hero from '../components/Hero'
import Preview from '../components/Preview'
import FeaturesSub from '../components/FeaturesSub'
import Features from '../components/Features'
import LanguageSupport from '../components/LanguageSupport'
import Footer from '../components/Footer'
import HeroBackground from '../components/HeroBackground'

function HomePageContent () {
  const windowSize = useWindowSize()
  const isMobile = useMemo(() => {
    return windowSize === 'mobile'
  }, [windowSize])

  return !isMobile
    ? (
    <>
      <HeroBackground>
        <Hero />
        <Features />
      </HeroBackground>
      <Preview />
      <div className="mt-28">
        <LanguageSupport />
      </div>
      <div className="mt-44">
        <FeaturesSub />
      </div>
    </>
      )
    : (
    <>
      <HeroBackground>
        <Hero />
        <Preview />
      </HeroBackground>
      <div className="mt-8 mb-8">
        <LanguageSupport />
      </div>
      <div className="mt-16">
        <FeaturesSub />
      </div>
      <div className="mt-16">
        <Features />
      </div>
    </>
      )
}

export default function HomePage () {
  const { siteConfig } = useDocusaurusContext() as any
  return (
    <Layout title={`${siteConfig.title as string} · ${siteConfig.tagline as string}`} description={siteConfig.description}>
      <HomePageContent />
      <Footer />
    </Layout>
  )
}

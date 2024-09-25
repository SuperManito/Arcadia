import React from 'react'
import Layout from '@theme/Layout'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import { cn } from './lib/utils'
import { useMotionValue, motion, useMotionTemplate } from 'framer-motion'
import Hero from './components/Hero'
import Preview from './components/Preview'
import Features from './components/Features'
import LanguageSupport from './components/LanguageSupport'
import Footer from './components/Footer'

function HeroHighlight ({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode
  className?: string
  containerClassName?: string
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove ({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    if (!currentTarget) return
    const { left, top } = currentTarget.getBoundingClientRect()

    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }
  return (
    <div
      className={cn(
        'relative w-full h-full flex items-center bg-transparent justify-center group',
        containerClassName,
      )}
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 bg-dot-thick-neutral-100 dark:bg-dot-thick-neutral-900  pointer-events-none" />
      <motion.div
        className="pointer-events-none bg-dot-thick-indigo-500 dark:bg-dot-thick-indigo-500   absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          WebkitMaskImage: useMotionTemplate`
            radial-gradient(
              200px circle at ${mouseX}px ${mouseY}px,
              black 0%,
              transparent 100%
            )
          `,
          maskImage: useMotionTemplate`
            radial-gradient(
              200px circle at ${mouseX}px ${mouseY}px,
              black 0%,
              transparent 100%
            )
          `,
        }}
      />

      <div className={cn('relative z-20', className)}>{children}</div>
    </div>
  )
}

export default function Home () {
  const { siteConfig } = useDocusaurusContext() as any
  return (
    <Layout title={`${siteConfig.title as string} · ${siteConfig.tagline as string}`} description={siteConfig.description}>
        <HeroHighlight className="w-[100vw] min-h-[100vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [20, -5, 0] }}
            transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
          >
          <Hero />
          <Preview />
          </motion.div>
        </HeroHighlight>
        <LanguageSupport />
        <Features />
        <Footer />
    </Layout>
  )
}

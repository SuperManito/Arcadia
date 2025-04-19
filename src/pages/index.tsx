import React from 'react'
import Layout from '@theme/Layout'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import { useMotionValue, motion, useMotionTemplate } from 'motion/react'
import { cn } from '../components/lib/utils'
import Hero from '../components/Hero'
import Preview from '../components/Preview'
import Features from '../components/Features'
import LanguageSupport from '../components/LanguageSupport'
import Footer from '../components/Footer'

function HeroHighlightBackground ({
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

  const dotPatterns = {
    light: {
      hover: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\' width=\'16\' height=\'16\' fill=\'none\'%3E%3Ccircle fill=\'%236366f1\' id=\'pattern-circle\' cx=\'10\' cy=\'10\' r=\'2.5\'%3E%3C/circle%3E%3C/svg%3E")',
    },
    dark: {
      hover: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\' width=\'16\' height=\'16\' fill=\'none\'%3E%3Ccircle fill=\'%238183f4\' id=\'pattern-circle\' cx=\'10\' cy=\'10\' r=\'2.5\'%3E%3C/circle%3E%3C/svg%3E")',
    },
  }

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
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
      />
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
      />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 dark:hidden"
        style={{
          backgroundImage: dotPatterns.light.hover,
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
      <motion.div
        className="pointer-events-none absolute inset-0 hidden opacity-0 transition duration-300 group-hover:opacity-100 dark:block"
        style={{
          backgroundImage: dotPatterns.dark.hover,
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
      <HeroHighlightBackground className="w-[100vw] min-h-[calc(100vh-60px)] lg:min-h-[calc(100vh-44px)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [20, -5, 0] }}
          transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
        >
        <Hero />
        <Preview />
        </motion.div>
      </HeroHighlightBackground>
      <LanguageSupport />
      <Features />
      <Footer />
    </Layout>
  )
}

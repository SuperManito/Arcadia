import React from 'react'
import { useBaseUrl } from '../../hooks/useBaseUrl'
import { motion } from 'motion/react'
import { scrollFeatures, type ScrollFeatureItem } from './data'

function ScrollFeature ({ feature, index }: { feature: ScrollFeatureItem, index: number }) {
  const isReversed = index % 2 !== 0
  const imgLight = useBaseUrl(feature.imgUrlLight)
  const imgDark = useBaseUrl(feature.imgUrlDark)

  return (
    <div className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-20 mb-24 md:mb-64 last:mb-0 ${isReversed ? 'lg:flex-row-reverse' : ''}`}>
      <motion.div
        className="w-full lg:w-1/2 flex flex-col items-center lg:items-start"
        initial={{ opacity: 0, x: isReversed ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        viewport={{ once: true, margin: '-100px' }}
      >
        <div className="inline-block px-3 py-1 mb-3 lg:mb-4 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs lg:text-sm font-semibold tracking-wider uppercase">
          {feature.badge}
        </div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-white mb-4 lg:mb-6 text-center lg:text-left">
          {feature.title}
        </div>
        <div className="text-sm sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed text-justify">
          {feature.description}
        </div>
      </motion.div>

      <motion.div
        className="w-full lg:w-1/2"
        initial={{ opacity: 0, x: isReversed ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        viewport={{ once: true, margin: '-100px' }}
      >
        <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-neutral-200/50 dark:border-neutral-800/80 bg-neutral-100 dark:bg-neutral-900">
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent dark:from-black/40 pointer-events-none mix-blend-overlay"></div>
          <img src={imgLight} alt={feature.title} className="w-full h-auto object-cover block dark:hidden select-none" loading="lazy" draggable={false} />
          <img src={imgDark} alt={feature.title} className="w-full h-auto object-cover hidden dark:block select-none" loading="lazy" draggable={false} />
        </div>
      </motion.div>
    </div>
  )
}

export default function ScrollFeaturesSection () {
  return (
    <div className="py-16 sm:py-24 bg-white dark:bg-neutral-950 overflow-hidden border-neutral-100 dark:border-neutral-900">
      <div className="container mx-auto px-4 max-w-7xl">
        {scrollFeatures.map((feature, index) => (
          <ScrollFeature key={index} feature={feature} index={index} />
        ))}
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import cn from '../../lib/utils'

export interface TypewriterWord {
  text: string
  className?: string
}

interface TypewriterEffectProps {
  words: TypewriterWord[]
  className?: string
  cursorClassName?: string
}

export default function TypewriterEffect ({
  words,
  className,
  cursorClassName,
}: TypewriterEffectProps) {
  const [fileType, setFileType] = useState((words as any)[words.length - 1].text)

  const staticWords = words.slice(0, -1)
  const dynamicWord = words[words.length - 1]

  const staticWordsArray = staticWords.map((word) => ({
    ...word,
    text: word.text.split(''),
  }))

  const renderStaticWords = () => (
    <>
      {staticWordsArray.map((word, idx) => (
        <div key={`word-${idx}`} className="inline-block">
          {word.text.map((char, index) => (
            <span
              key={`char-${index}`}
              className={cn('dark:text-white text-black', word.className)}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
          &nbsp;
        </div>
      ))}
    </>
  )

  const renderDynamicWord = () => (
    <motion.div
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      className={cn('inline-block', (dynamicWord as any).className)}
      key={fileType}
      initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      exit={{ opacity: 0, filter: 'blur(10px)', y: -10 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {fileType.split('').map((char: string, index: number) => (
        <motion.span
          key={`dynamic-char-${index}`}
          initial={{ opacity: 0, filter: 'blur(5px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ delay: index * 0.03 }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.div>
  )

  useEffect(() => {
    if ((words as any)[words.length - 1].text !== fileType) {
      setFileType((words as any)[words.length - 1].text)
    }
  }, [words])

  return (
    <div className={cn('flex space-x-1 my-4 lg:my-6', className)} style={{ fontFamily: 'var(--ifm-font-family-monospace' }}>
      <motion.div
        className="overflow-hidden pb-2"
        initial={{ width: '0%' }}
        whileInView={{ width: 'fit-content' }}
        transition={{ duration: 1, ease: 'linear', delay: 1 }}
      >
        <div
          className="text-xl lg:text-3xl xl:text-5xl font-bold"
          style={{ whiteSpace: 'nowrap' }}
        >
          {renderStaticWords()}
          <AnimatePresence mode="wait">
            {renderDynamicWord()}
          </AnimatePresence>
        </div>
      </motion.div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        className={cn('block rounded-sm w-1 h-6 sm:h-6 lg:h-12 bg-blue-500', cursorClassName)}
      />
    </div>
  )
}

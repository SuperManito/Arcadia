import React, { useMemo, useState, useEffect } from 'react'
import { useWindowSize } from '@docusaurus/theme-common'
import Link from '@docusaurus/Link'
import cn from '../lib/utils'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'

const TypewriterEffect = ({
  words,
  className,
  cursorClassName,
}: {
  words: Array<{
    text: string
    className?: string
  }>
  className?: string
  cursorClassName?: string
}) => {
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(''),
    }
  })
  const renderWords = () => {
    return (
      <div>
        {wordsArray.map((word, idx) => {
          return (
            <div key={`word-${idx}`} className="inline-block">
              {word.text.map((char, index) => (
                <span
                  key={`char-${index}`}
                  className={cn('dark:text-white text-black ', word.className)}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
              &nbsp;
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('flex space-x-1 my-4 lg:my-6 ml-6', className)} style={{ fontFamily: 'var(--ifm-font-family-monospace' }}>
      <motion.div
        className="overflow-hidden pb-2"
        initial={{
          width: '0%',
        }}
        whileInView={{
          width: 'fit-content',
        }}
        transition={{
          duration: 1,
          ease: 'linear',
          delay: 1,
        }}
      >
        <div
          className="text-base sm:text-base md:text-xl lg:text-3xl xl:text-5xl font-bold"
          style={{
            whiteSpace: 'nowrap',
          }}
        >
          {renderWords()}{' '}
        </div>{' '}
      </motion.div>
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        className={cn(
          'block rounded-sm w-[4px] h-6 sm:h-6 lg:h-12 bg-blue-500',
          cursorClassName,
        )}
      ></motion.span>
    </div>
  )
}

export default function LanguageSupport () {
  const files = ['js ', 'ts ', 'py ', 'go ', 'rs ', 'lua', 'rb ', 'pl ', 'c  ', 'sh ']
  const [fileType, setFileType] = useState(files[0])
  const [index, setIndex] = useState(0)
  const windowSize = useWindowSize()
  const isMobile = useMemo(() => {
    return windowSize === 'mobile'
  }, [windowSize])

  useEffect(() => {
    const delay = 2000
    const startInterval = () => {
      const interval = setInterval(() => {
        setIndex((prevIndex) => (prevIndex + 1) % files.length)
      }, 2000)
      return () => { clearInterval(interval) } // 清除定时器
    }
    const timeout = setTimeout(startInterval, delay)
    return () => { clearTimeout(timeout) } // 清除延迟
  }, [])

  useEffect(() => {
    setFileType(files[index])
  }, [index])

  const words = [
    {
      text: ' arcadia',
    },
    {
      text: 'run',
    },
    {
      text: `index.${fileType}`,
      className: 'text-[var(--ifm-color-primary)] dark:text-[var(--ifm-color-primary)]',
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-[16rem] lg:h-[20rem] bg-[var(--ifm-color-emphasis-100)]">
      <p className="text-neutral-600 dark:text-neutral-200">
        <span className="mb-0 text-[1.25rem] lg:text-[1.5rem] font-semibold">一键运行代码文件</span>
      </p>
      <TypewriterEffect words={words} />
      <div className="mt-4 ml-8 lg:ml-20 flex flex-wrap justify-center items-center space-y-4">
        <div>
          <Link href="https://nodejs.org" title="Node.js" target="_blank" rel="noreferrer">
            <Icon icon="logos:nodejs" height={isMobile ? 24 : 56} className={isMobile ? 'mt-4 mr-4' : 'mt-4 mr-20'} />
          </Link>
        </div>
        <div>
          <Link href="https://typestrong.org/ts-node" title="ts-node" target="_blank" rel="noreferrer">
            <Icon icon="logos:tsnode" height={isMobile ? 18 : 48} className={isMobile ? 'mr-4' : 'mr-20'} />
          </Link>
        </div>
        <div>
          <Link href="https://bun.sh" title="Bun" target="_blank" rel="noreferrer">
            <Icon icon="logos:bun" height={isMobile ? 18 : 48} className={isMobile ? 'mr-4' : 'mr-20'} />
          </Link>
        </div>
        <div>
          <Link href="https://www.python.org" title="Python" target="_blank" rel="noreferrer">
            <Icon icon="logos:python" height={isMobile ? 18 : 48} className={isMobile ? 'mr-4' : 'mr-16'} />
          </Link>
        </div>
        <div>
          <Link href="https://golang.org" title="Go" target="_blank" rel="noreferrer">
            <Icon icon="logos:go" height={isMobile ? 18 : 42} className={isMobile ? 'mr-4' : 'mr-20'} />
          </Link>
        </div>
        <div>
          <Link href="https://www.rust-lang.org" title="Rust" target="_blank" rel="noreferrer">
            <Icon icon="logos:rust" height={isMobile ? 22 : 56} className={isMobile ? 'mr-4' : 'mr-20'} />
          </Link>
        </div>
        <div>
          <Link href="https://www.lua.org" title="Lua" target="_blank" rel="noreferrer">
            <Icon icon="logos:lua" height={isMobile ? 22 : 56} className={isMobile ? 'mr-4' : 'mr-20'} />
          </Link>
        </div>
        <div>
          <Link href="https://www.ruby-lang.org" title="Ruby" target="_blank" rel="noreferrer">
            <Icon icon="logos:ruby" height={isMobile ? 16 : 42} className={isMobile ? 'mr-4' : 'mr-20'} />
          </Link>
        </div>
        <div>
          <Link href="https://www.perl.org" title="Perl" target="_blank" rel="noreferrer">
            <Icon icon="vscode-icons:file-type-perl" height={isMobile ? 20 : 48} className={isMobile ? 'mr-4' : 'mr-20'} />
          </Link>
        </div>
      </div>
    </div>
  )
}

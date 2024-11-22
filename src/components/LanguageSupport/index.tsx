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
      <div className="mt-4 ml-0 lg:ml-20 flex flex-wrap justify-center items-center space-y-4">
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
          <Link href="https://deno.com" title="Deno" target="_blank" rel="noreferrer">
            <svg width={isMobile ? 18 : 56} height={isMobile ? 18 : 56} viewBox="0 0 331 331" className={isMobile ? 'mr-4' : 'mr-20'} version="1.1" xmlns="http://www.w3.org/2000/svg">
              <path d="M28.829,227.937c-8.871,-19.143 -13.822,-40.465 -13.822,-62.935c-0,-5.815 0.332,-11.554 0.977,-17.197c0.655,-5.703 1.626,-11.299 2.893,-16.773c7.12,-30.704 23.68,-57.808 46.452,-78.082c19.127,-17.006 42.558,-29.14 68.244,-34.64c10.137,-2.165 20.651,-3.304 31.43,-3.304c3.778,0.004 7.583,0.149 11.411,0.441c18.154,1.386 35.309,5.956 50.959,13.121c12.625,5.786 24.31,13.274 34.762,22.169c26.253,22.364 44.562,53.517 50.651,88.476c1.455,8.379 2.213,16.996 2.213,25.789c-0.003,3.784 -0.149,7.595 -0.442,11.429c-1.106,14.489 -4.241,28.342 -9.104,41.302c-6.788,18.051 -16.959,34.452 -29.738,48.428c-16.621,16.971 -37.743,24.523 -55.384,24.209c-12.828,-0.229 -25.379,-5.333 -34.052,-12.801c-12.39,-10.669 -17.394,-22.865 -19.11,-36.474c-0.426,-3.383 -0.176,-12.601 1.585,-18.984c1.312,-4.758 4.64,-13.946 9.507,-17.965c-5.693,-2.452 -13.021,-7.792 -15.331,-10.355c-0.568,-0.63 -0.494,-1.617 0.014,-2.296c0.509,-0.678 1.4,-0.946 2.199,-0.659c4.895,1.68 10.856,3.337 17.142,4.389c8.267,1.382 18.548,3.122 28.963,3.634c25.395,1.247 51.921,-10.151 60.154,-32.83c8.232,-22.679 5.038,-45.111 -24.496,-58.566c-29.535,-13.456 -43.178,-29.455 -67.041,-39.104c-15.587,-6.303 -32.935,-2.561 -50.746,7.282c-47.974,26.512 -90.955,110.279 -71.142,187.887c0.283,1.062 -0.195,2.18 -1.158,2.709c-0.903,0.495 -2.013,0.354 -2.761,-0.331c-5.766,-6.336 -10.998,-13.166 -15.623,-20.421c-3.578,-5.614 -6.79,-11.475 -9.606,-17.548Z" fill="#000"></path>
              <path id="eye" d="M159.634,78.772c8.092,-0.634 15.152,6.272 16.369,15.457c1.624,12.235 -2.867,24.874 -17.633,25.165c-12.614,0.252 -16.436,-12.469 -15.6,-20.175c0.83,-7.706 7.182,-19.687 16.864,-20.447Z" fill="#000"></path>
            </svg>
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

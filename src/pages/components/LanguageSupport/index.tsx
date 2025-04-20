import React, { useMemo, useState, useEffect } from 'react'
import { useWindowSize } from '@docusaurus/theme-common'
import Link from '@docusaurus/Link'
import { cn } from '../lib/utils'
import { BlurFade } from '../BlurFade'
import { motion, AnimatePresence } from 'motion/react'
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
  const [fileType, setFileType] = useState((words as any)[words.length - 1].text)

  // 分离静态单词和动态变化的单词
  const staticWords = words.slice(0, -1)
  const dynamicWord = words[words.length - 1]

  // 将静态单词转换为字符数组
  const staticWordsArray = staticWords.map((word) => {
    return {
      ...word,
      text: word.text.split(''),
    }
  })

  const renderStaticWords = () => {
    return (
      <>
        {staticWordsArray.map((word, idx) => {
          return (
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
          )
        })}
      </>
    )
  }

  // 渲染动态变化的单词（最后一个单词）
  const renderDynamicWord = () => {
    return (
      <motion.div
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        className={cn('inline-block', (dynamicWord as any).className)}
        key={fileType} // 使用 key 让 React 在值变化时创建新元素
        initial={{
          opacity: 0,
          filter: 'blur(10px)',
          y: 10,
        }}
        animate={{
          opacity: 1,
          filter: 'blur(0px)',
          y: 0,
        }}
        exit={{
          opacity: 0,
          filter: 'blur(10px)',
          y: -10,
        }}
        transition={{
          duration: 0.3,
          ease: 'easeInOut',
        }}
      >
        {fileType.split('').map((char: any, index: any) => (
          <motion.span
            key={`dynamic-char-${index}`}
            initial={{
              opacity: 0,
              filter: 'blur(5px)',
            }}
            animate={{
              opacity: 1,
              filter: 'blur(0px)',
            }}
            transition={{
              delay: index * 0.03,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </motion.div>
    )
  }

  // 当父组件中的 fileType 变化时更新本地状态
  useEffect(() => {
    if ((words as any)[words.length - 1].text !== fileType) {
      setFileType((words as any)[words.length - 1].text)
    }
  }, [words])

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
          {renderStaticWords()}
          <AnimatePresence mode="wait">
            {renderDynamicWord()}
          </AnimatePresence>
        </div>
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

function LanguageLogos () {
  const windowSize = useWindowSize()
  const isMobile = useMemo(() => {
    return windowSize === 'mobile'
  }, [windowSize])
  return (
    <div className="mt-4 mb-8 md:mb-16 md:mt-16 grid grid-cols-5 md:grid-cols-10 gap-2 sm:gap-4 justify-items-center">
      <div>
        <Link href="https://nodejs.org" title="Node.js" target="_blank" rel="noreferrer">
          <Icon icon="logos:nodejs" height={isMobile ? 16 : 48} />
        </Link>
      </div>
      <div>
        <Link href="https://typestrong.org/ts-node" title="ts-node" target="_blank" rel="noreferrer">
          <Icon icon="logos:tsnode" height={isMobile ? 14 : 44} style={{ marginTop: isMobile ? '0' : '3px' }} />
        </Link>
      </div>
      <div>
        <Link href="https://deno.com" title="Deno" target="_blank" rel="noreferrer">
          <svg width={isMobile ? 18 : 48} height={isMobile ? 18 : 48} style={{ marginTop: isMobile ? '0' : '2px' }} viewBox="0 0 331 331" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <path d="M28.829,227.937c-8.871,-19.143 -13.822,-40.465 -13.822,-62.935c-0,-5.815 0.332,-11.554 0.977,-17.197c0.655,-5.703 1.626,-11.299 2.893,-16.773c7.12,-30.704 23.68,-57.808 46.452,-78.082c19.127,-17.006 42.558,-29.14 68.244,-34.64c10.137,-2.165 20.651,-3.304 31.43,-3.304c3.778,0.004 7.583,0.149 11.411,0.441c18.154,1.386 35.309,5.956 50.959,13.121c12.625,5.786 24.31,13.274 34.762,22.169c26.253,22.364 44.562,53.517 50.651,88.476c1.455,8.379 2.213,16.996 2.213,25.789c-0.003,3.784 -0.149,7.595 -0.442,11.429c-1.106,14.489 -4.241,28.342 -9.104,41.302c-6.788,18.051 -16.959,34.452 -29.738,48.428c-16.621,16.971 -37.743,24.523 -55.384,24.209c-12.828,-0.229 -25.379,-5.333 -34.052,-12.801c-12.39,-10.669 -17.394,-22.865 -19.11,-36.474c-0.426,-3.383 -0.176,-12.601 1.585,-18.984c1.312,-4.758 4.64,-13.946 9.507,-17.965c-5.693,-2.452 -13.021,-7.792 -15.331,-10.355c-0.568,-0.63 -0.494,-1.617 0.014,-2.296c0.509,-0.678 1.4,-0.946 2.199,-0.659c4.895,1.68 10.856,3.337 17.142,4.389c8.267,1.382 18.548,3.122 28.963,3.634c25.395,1.247 51.921,-10.151 60.154,-32.83c8.232,-22.679 5.038,-45.111 -24.496,-58.566c-29.535,-13.456 -43.178,-29.455 -67.041,-39.104c-15.587,-6.303 -32.935,-2.561 -50.746,7.282c-47.974,26.512 -90.955,110.279 -71.142,187.887c0.283,1.062 -0.195,2.18 -1.158,2.709c-0.903,0.495 -2.013,0.354 -2.761,-0.331c-5.766,-6.336 -10.998,-13.166 -15.623,-20.421c-3.578,-5.614 -6.79,-11.475 -9.606,-17.548Z" fill="#000"></path>
            <path id="eye" d="M159.634,78.772c8.092,-0.634 15.152,6.272 16.369,15.457c1.624,12.235 -2.867,24.874 -17.633,25.165c-12.614,0.252 -16.436,-12.469 -15.6,-20.175c0.83,-7.706 7.182,-19.687 16.864,-20.447Z" fill="#000"></path>
          </svg>
        </Link>
      </div>
      <div>
        <Link href="https://bun.sh" title="Bun" target="_blank" rel="noreferrer">
          <Icon icon="logos:bun" height={isMobile ? 18 : 48} />
        </Link>
      </div>
      <div>
        <Link href="https://www.python.org" title="Python" target="_blank" rel="noreferrer">
          <Icon icon="logos:python" height={isMobile ? 18 : 44} style={{ marginTop: isMobile ? '0' : '2px' }} />
        </Link>
      </div>
      <div>
        <Link href="https://golang.org" title="Go" target="_blank" rel="noreferrer">
          <Icon icon="logos:go" height={isMobile ? 14 : 44} style={{ marginTop: isMobile ? '4px' : '4px' }} />
        </Link>
      </div>
      <div>
        <Link href="https://www.rust-lang.org" title="Rust" target="_blank" rel="noreferrer">
          <Icon icon="vscode-icons:file-type-rust" height={isMobile ? 22 : 50} />
        </Link>
      </div>
      <div>
        <Link href="https://www.lua.org" title="Lua" target="_blank" rel="noreferrer">
          <Icon icon="logos:lua" height={isMobile ? 22 : 50} />
        </Link>
      </div>
      <div>
        <Link href="https://www.ruby-lang.org" title="Ruby" target="_blank" rel="noreferrer">
          <Icon icon="logos:ruby" height={isMobile ? 16 : 40} style={{ marginTop: isMobile ? '2px' : '5px' }} />
        </Link>
      </div>
      <div>
        <Link href="https://www.perl.org" title="Perl" target="_blank" rel="noreferrer">
          <Icon icon="vscode-icons:file-type-perl" height={isMobile ? 20 : 44} style={{ marginTop: isMobile ? '2px' : '2px' }} />
        </Link>
      </div>
    </div>
  )
}

export default function LanguageSupport () {
  const files = ['js ', 'ts ', 'py ', 'go ', 'rs ', 'lua', 'rb ', 'pl ', 'c  ', 'sh ']
  const [fileType, setFileType] = useState(files[0])
  const [index, setIndex] = useState(0)

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
      text: `script.${fileType}`,
      className: 'text-[var(--ifm-color-primary)] dark:text-[var(--ifm-color-primary)]',
    },
  ]

  return (
    <section className='container'>
      <div className="flex flex-col items-center justify-center h-[16rem] lg:h-full rounded-2xl" style={{ margin: '0 auto' }}>
        <div className="mt-8 md:mt-16 md:mb-16 text-neutral-600 dark:text-[var(--ifm-color-emphasis-500)] text-center">
          <BlurFade delay={0.25} inView>
          <span className="font-bold tracking-tighter text-[1.4rem] md:text-[2.5rem] inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg"
                className="mr-2 md:mr-4"
                width="1em" height="1em"
                viewBox="0 0 22 22">
                <path fill="currentColor" d="M6.5 21q-1.45 0-2.475-1.025T3 17.5t1.025-2.475T6.5 14H8v-4H6.5q-1.45 0-2.475-1.025T3 6.5t1.025-2.475T6.5 3t2.475 1.025T10 6.5V8h4V6.5q0-1.45 1.025-2.475T17.5 3t2.475 1.025T21 6.5t-1.025 2.475T17.5 10H16v4h1.5q1.45 0 2.475 1.025T21 17.5t-1.025 2.475T17.5 21t-2.475-1.025T14 17.5V16h-4v1.5q0 1.45-1.025 2.475T6.5 21m0-2q.625 0 1.063-.437T8 17.5V16H6.5q-.625 0-1.062.438T5 17.5t.438 1.063T6.5 19m11 0q.625 0 1.063-.437T19 17.5t-.437-1.062T17.5 16H16v1.5q0 .625.438 1.063T17.5 19M10 14h4v-4h-4zM6.5 8H8V6.5q0-.625-.437-1.062T6.5 5t-1.062.438T5 6.5t.438 1.063T6.5 8M16 8h1.5q.625 0 1.063-.437T19 6.5t-.437-1.062T17.5 5t-1.062.438T16 6.5z"/>
            </svg>
            <span>强大的 CLI，无以伦比</span>
          </span>
          </BlurFade>
          <BlurFade delay={0.25 * 3} inView className='mt-2 md:mt-4'>
            <span className="font-bold tracking-tighter text-[.8rem] md:text-[1rem] block">一键运行代码文件</span>
          </BlurFade>
        </div>
        <TypewriterEffect words={words} />
        <LanguageLogos />
      </div>
    </section>
  )
}

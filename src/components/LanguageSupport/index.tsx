import React, { useMemo, useState, useEffect } from 'react'
import { Icon } from '../Icon'
import { useWindowSize } from '@docusaurus/theme-common'
import Link from '@docusaurus/Link'
import cn from '../lib/utils'
import BlurFade from '../BlurFade'
import { motion, AnimatePresence } from 'motion/react'

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
    <div className="mt-4 mb-4 md:mb-16 md:mt-16 ml-8 md:ml-0 mr-8 md:mr-0 flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8">
      <div>
        <Link href="https://nodejs.org" title="Node.js" target="_blank" rel="noreferrer">
          <em className="select-none">
            <svg className="block dark:hidden" height={isMobile ? 16 : 48} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 289 177" fill="none"><g clipPath="url(#clip0_337_7900)"><mask id="mask0_337_7900" maskUnits="userSpaceOnUse" x="0" y="0" width="289" height="177" style={{ maskType: 'luminance' }}><path d="M289 0H0v177h289V0Z" fill="#fff"/></mask><g mask="url(#mask0_337_7900)"><path d="M142.802 177c-.98 0-1.895-.261-2.744-.719l-8.688-5.161c-1.307-.719-.653-.98-.262-1.111 1.764-.588 2.091-.719 3.92-1.764.196-.131.457-.066.653.065l6.663 3.986c.262.13.588.13.784 0l26.065-15.093c.262-.131.392-.392.392-.719v-30.121c0-.326-.13-.588-.392-.718l-26.065-15.028c-.261-.131-.588-.131-.784 0l-26.064 15.028c-.262.13-.392.457-.392.718v30.121c0 .261.13.588.392.719l7.12 4.116c3.854 1.96 6.271-.327 6.271-2.614v-29.728c0-.392.327-.784.784-.784h3.332c.392 0 .784.326.784.784v29.728c0 5.162-2.809 8.168-7.709 8.168-1.502 0-2.678 0-6.01-1.634l-6.859-3.92a5.515 5.515 0 0 1-2.743-4.77v-30.12a5.514 5.514 0 0 1 2.743-4.77l26.065-15.093c1.633-.915 3.854-.915 5.487 0l26.065 15.093a5.513 5.513 0 0 1 2.744 4.77v30.12c0 1.96-1.045 3.79-2.744 4.77l-26.065 15.093c-.784.327-1.763.588-2.743.588Z" fill="#5FA04E"/><path d="M150.902 156.288c-11.432 0-13.784-5.227-13.784-9.67 0-.392.327-.784.784-.784h3.397c.392 0 .719.261.719.653.522 3.463 2.025 5.162 8.949 5.162 5.488 0 7.839-1.241 7.839-4.182 0-1.698-.653-2.94-9.211-3.789-7.12-.719-11.562-2.287-11.562-7.971 0-5.293 4.442-8.429 11.889-8.429 8.362 0 12.477 2.875 13 9.147 0 .196-.066.392-.196.588-.131.131-.327.262-.523.262h-3.462a.767.767 0 0 1-.719-.588c-.784-3.594-2.809-4.77-8.165-4.77-6.01 0-6.729 2.091-6.729 3.659 0 1.895.849 2.483 8.95 3.528 8.035 1.045 11.824 2.548 11.824 8.167 0 5.75-4.769 9.017-13 9.017ZM188.529 124.664c0 2.745-2.286 5.031-5.03 5.031-2.743 0-5.03-2.221-5.03-5.031 0-2.874 2.352-5.031 5.03-5.031 2.679 0 5.03 2.222 5.03 5.031Zm-9.276 0c0 2.353 1.895 4.247 4.181 4.247 2.352 0 4.246-1.96 4.246-4.247 0-2.352-1.894-4.181-4.246-4.181-2.221 0-4.181 1.829-4.181 4.181Zm2.352-2.809h1.96c.653 0 1.959 0 1.959 1.503 0 1.045-.653 1.241-1.045 1.372.784.065.849.588.915 1.307.065.457.13 1.241.261 1.502h-1.176c0-.261-.196-1.698-.196-1.764-.065-.326-.196-.457-.588-.457h-.98v2.287h-1.11v-5.75Zm1.045 2.483h.849c.719 0 .85-.523.85-.784 0-.784-.523-.784-.85-.784h-.914v1.568h.065Z" fill="#5FA04E"/><path fillRule="evenodd" clipRule="evenodd" d="M61.994 59.196a3.324 3.324 0 0 0-1.699-2.875L32.663 40.313c-.457-.26-.98-.392-1.503-.457H30.9c-.523 0-1.045.196-1.503.457L1.698 56.256A3.35 3.35 0 0 0 0 59.196l.065 42.862c0 .588.327 1.176.85 1.437.522.327 1.175.327 1.633 0l16.462-9.409a3.324 3.324 0 0 0 1.698-2.874v-20.06c0-1.175.653-2.286 1.699-2.874l6.99-4.051c.522-.327 1.11-.457 1.698-.457.588 0 1.176.13 1.633.457l6.99 4.051a3.324 3.324 0 0 1 1.698 2.875V91.21c0 1.177.654 2.287 1.699 2.875l16.331 9.409a1.593 1.593 0 0 0 1.699 0c.522-.261.849-.849.849-1.437V59.196ZM195.127.196c-.522-.261-1.176-.261-1.633 0-.522.327-.849.85-.849 1.437v42.47c0 .392-.196.784-.588 1.045a1.25 1.25 0 0 1-1.176 0l-6.924-3.985a3.367 3.367 0 0 0-3.332 0L152.927 57.17a3.325 3.325 0 0 0-1.698 2.874v31.95c0 1.177.653 2.287 1.698 2.875l27.698 16.008a3.367 3.367 0 0 0 3.332 0l27.698-16.008a3.324 3.324 0 0 0 1.698-2.874V12.349a3.35 3.35 0 0 0-1.698-2.94L195.127.196Zm-2.547 81.28c0 .327-.131.588-.392.719l-9.473 5.488a.968.968 0 0 1-.849 0l-9.472-5.488c-.261-.13-.392-.457-.392-.719V70.5c0-.326.131-.588.392-.718l9.472-5.489a.968.968 0 0 1 .849 0l9.473 5.489c.261.13.392.457.392.718v10.977ZM287.301 70.238c1.046-.588 1.634-1.699 1.634-2.875v-7.775a3.404 3.404 0 0 0-1.634-2.875l-27.502-15.942a3.365 3.365 0 0 0-3.331 0L228.77 56.779a3.325 3.325 0 0 0-1.699 2.874v31.95c0 1.177.654 2.287 1.699 2.875l27.502 15.681c1.045.589 2.286.589 3.266 0l16.658-9.277c.523-.262.849-.85.849-1.438s-.326-1.176-.849-1.437l-27.829-16.008c-.522-.327-.849-.85-.849-1.438v-9.996c0-.588.327-1.176.849-1.438l8.689-4.965a1.593 1.593 0 0 1 1.698 0l8.688 4.965c.523.327.85.85.85 1.438v7.84c0 .588.326 1.176.849 1.438a1.594 1.594 0 0 0 1.698 0l16.462-9.605Z" fill="#333"/><path fillRule="evenodd" clipRule="evenodd" d="M257.709 68.735a.593.593 0 0 1 .653 0l5.291 3.071c.196.13.327.327.327.588v6.142a.686.686 0 0 1-.327.588l-5.291 3.07a.593.593 0 0 1-.653 0l-5.292-3.07a.685.685 0 0 1-.326-.588v-6.142c0-.261.13-.457.326-.588l5.292-3.07Z" fill="#5FA04E"/><path d="M108.31 40.901a3.367 3.367 0 0 0-3.332 0L77.476 56.778c-1.045.589-1.633 1.7-1.633 2.875v31.82c0 1.176.653 2.287 1.633 2.875l27.502 15.877a3.367 3.367 0 0 0 3.332 0l27.502-15.877c1.045-.588 1.633-1.7 1.633-2.875v-31.82a3.406 3.406 0 0 0-1.633-2.874L108.31 40.9Z" fill="url(#paint0_linear_337_7900)"/><path d="M135.877 56.779 108.244 40.9a4.543 4.543 0 0 0-.849-.326L76.5 93.5c.261.327.673.804 1 1l27.478 15.725c.784.457 1.698.588 2.548.326l29.069-53.184a2.044 2.044 0 0 0-.718-.588Z" fill="url(#paint1_linear_337_7900)"/><path d="m104.063 35.086-.392.196h.523l-.131-.196Z" fill="url(#paint2_linear_337_7900)"/><path d="M135.809 94.348c.784-.458 1.491-1.315 1.491-2.348l-30.104-51.49c-.784-.131-1.633-.066-2.352.391L77.408 56.713 107 110.682a4.54 4.54 0 0 0 1.241-.392l27.568-15.942Z" fill="url(#paint3_linear_337_7900)"/></g></g><defs><linearGradient id="paint0_linear_337_7900" x1="117.844" y1="52.726" x2="92.971" y2="103.459" gradientUnits="userSpaceOnUse"><stop stopColor="#3F873F"/><stop offset=".33" stopColor="#3F8B3D"/><stop offset=".637" stopColor="#3E9638"/><stop offset=".934" stopColor="#3DA92E"/><stop offset="1" stopColor="#3DAE2B"/></linearGradient><linearGradient id="paint1_linear_337_7900" x1="102.464" y1="79.278" x2="172.246" y2="27.73" gradientUnits="userSpaceOnUse"><stop offset=".138" stopColor="#3F873F"/><stop offset=".402" stopColor="#52A044"/><stop offset=".713" stopColor="#64B749"/><stop offset=".908" stopColor="#6ABF4B"/></linearGradient><linearGradient id="paint2_linear_337_7900" x1="74.834" y1="35.163" x2="138.473" y2="35.163" gradientUnits="userSpaceOnUse"><stop offset=".092" stopColor="#6ABF4B"/><stop offset=".287" stopColor="#64B749"/><stop offset=".598" stopColor="#52A044"/><stop offset=".862" stopColor="#3F873F"/></linearGradient><linearGradient id="paint3_linear_337_7900" x1="74.835" y1="75.553" x2="138.473" y2="75.553" gradientUnits="userSpaceOnUse"><stop offset=".092" stopColor="#6ABF4B"/><stop offset=".287" stopColor="#64B749"/><stop offset=".598" stopColor="#52A044"/><stop offset=".862" stopColor="#3F873F"/></linearGradient><clipPath id="clip0_337_7900"><path fill="#fff" d="M0 0h289v177H0z"/></clipPath></defs></svg>

            <svg className="hidden dark:block" height={isMobile ? 16 : 48} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 319 195" fill="none"><g clipPath="url(#clip0_337_7901)"><mask id="mask0_337_7901" maskUnits="userSpaceOnUse" x="0" y="0" width="319" height="195" style={{ maskType: 'luminance' }}><path d="M319 0H0V195H319V0Z" fill="white"/></mask><g mask="url(#mask0_337_7901)"><path d="M157.625 195C156.544 195 155.534 194.712 154.597 194.208L145.007 188.522C143.565 187.73 144.286 187.442 144.718 187.298C146.665 186.65 147.026 186.506 149.045 185.354C149.261 185.21 149.549 185.282 149.766 185.426L157.121 189.817C157.409 189.961 157.77 189.961 157.986 189.817L186.756 173.189C187.045 173.045 187.189 172.757 187.189 172.398V139.214C187.189 138.854 187.045 138.566 186.756 138.422L157.986 121.866C157.697 121.722 157.337 121.722 157.121 121.866L128.35 138.422C128.062 138.566 127.917 138.926 127.917 139.214V172.398C127.917 172.686 128.062 173.045 128.35 173.189L136.21 177.724C140.464 179.884 143.132 177.364 143.132 174.845V142.093C143.132 141.661 143.492 141.229 143.997 141.229H147.675C148.107 141.229 148.54 141.589 148.54 142.093V174.845C148.54 180.532 145.439 183.843 140.031 183.843C138.373 183.843 137.075 183.843 133.398 182.043L125.826 177.724C123.952 176.645 122.798 174.629 122.798 172.47V139.286C122.798 137.126 123.952 135.111 125.826 134.031L154.597 117.403C156.4 116.395 158.851 116.395 160.654 117.403L189.424 134.031C191.299 135.111 192.453 137.126 192.453 139.286V172.47C192.453 174.629 191.299 176.645 189.424 177.724L160.654 194.352C159.789 194.712 158.707 195 157.625 195Z" fill="#5FA04E"/><path d="M166.567 172.182C153.948 172.182 151.352 166.423 151.352 161.528C151.352 161.096 151.713 160.664 152.217 160.664H155.967C156.4 160.664 156.76 160.952 156.76 161.384C157.337 165.199 158.995 167.071 166.639 167.071C172.696 167.071 175.291 165.703 175.291 162.464C175.291 160.592 174.57 159.225 165.124 158.289C157.265 157.497 152.362 155.77 152.362 149.507C152.362 143.677 157.265 140.221 165.485 140.221C174.715 140.221 179.257 143.389 179.834 150.299C179.834 150.515 179.762 150.731 179.618 150.947C179.474 151.091 179.257 151.235 179.041 151.235H175.219C174.859 151.235 174.498 150.947 174.426 150.587C173.561 146.628 171.326 145.332 165.413 145.332C158.779 145.332 157.986 147.636 157.986 149.363C157.986 151.451 158.923 152.099 167.864 153.25C176.734 154.402 180.916 156.058 180.916 162.248C180.916 168.583 175.652 172.182 166.567 172.182Z" fill="#5FA04E"/><path d="M208.1 137.342C208.1 140.365 205.576 142.885 202.548 142.885C199.519 142.885 196.996 140.437 196.996 137.342C196.996 134.175 199.591 131.8 202.548 131.8C205.504 131.8 208.1 134.247 208.1 137.342ZM197.861 137.342C197.861 139.934 199.952 142.021 202.476 142.021C205.072 142.021 207.163 139.862 207.163 137.342C207.163 134.751 205.072 132.735 202.476 132.735C200.024 132.735 197.861 134.751 197.861 137.342ZM200.457 134.247H202.62C203.341 134.247 204.783 134.247 204.783 135.903C204.783 137.054 204.062 137.27 203.629 137.414C204.495 137.486 204.567 138.062 204.639 138.854C204.711 139.358 204.783 140.221 204.927 140.509H203.629C203.629 140.221 203.413 138.638 203.413 138.566C203.341 138.206 203.197 138.062 202.764 138.062H201.683V140.581H200.457V134.247ZM201.61 136.982H202.548C203.341 136.982 203.485 136.406 203.485 136.118C203.485 135.255 202.908 135.255 202.548 135.255H201.538V136.982H201.61Z" fill="#5FA04E"/><path fillRule="evenodd" clipRule="evenodd" d="M68.4293 65.2159C68.4293 63.9203 67.7082 62.6966 66.5545 62.0487L36.0533 44.4131C35.5486 44.1251 34.9717 43.9812 34.3949 43.9092C34.3228 43.9092 34.1065 43.9092 34.1065 43.9092C33.5296 43.9092 32.9528 44.1251 32.448 44.4131L1.87477 61.9767C0.721067 62.6246 0 63.8483 0 65.2159L0.0721067 112.436C0.0721067 113.084 0.43264 113.732 1.00949 114.02C1.58635 114.38 2.30741 114.38 2.81216 114.02L20.983 103.654C22.1368 103.007 22.8578 101.783 22.8578 100.487V78.3887C22.8578 77.093 23.5789 75.8693 24.7326 75.2215L32.448 70.7586C33.0249 70.3987 33.6738 70.2547 34.3228 70.2547C34.9717 70.2547 35.6207 70.3987 36.1255 70.7586L43.8409 75.2215C44.9946 75.8693 45.7156 77.093 45.7156 78.3887V100.487C45.7156 101.783 46.4367 103.007 47.5904 103.654L65.6171 114.02C66.1939 114.38 66.915 114.38 67.4919 114.02C68.0687 113.732 68.4293 113.084 68.4293 112.436V65.2159Z" fill="white"/><path fillRule="evenodd" clipRule="evenodd" d="M215.382 0.215947C214.806 -0.0719823 214.085 -0.0719823 213.58 0.215947C213.003 0.575858 212.642 1.15172 212.642 1.79956V48.588C212.642 49.0199 212.426 49.4518 211.993 49.7398C211.561 49.9557 211.128 49.9557 210.696 49.7398L203.052 45.3488C201.899 44.701 200.528 44.701 199.375 45.3488L168.802 62.9845C167.648 63.6323 166.927 64.856 166.927 66.1517V101.351C166.927 102.647 167.648 103.87 168.802 104.518L199.375 122.154C200.528 122.802 201.899 122.802 203.052 122.154L233.625 104.518C234.779 103.87 235.5 102.647 235.5 101.351V13.6047C235.5 12.237 234.779 11.0133 233.625 10.3654L215.382 0.215947ZM212.57 89.7619C212.57 90.1218 212.426 90.4098 212.138 90.5537L201.682 96.6002C201.394 96.7442 201.033 96.7442 200.745 96.6002L190.289 90.5537C190.001 90.4098 189.857 90.0498 189.857 89.7619V77.6689C189.857 77.309 190.001 77.021 190.289 76.8771L200.745 70.8306C201.033 70.6866 201.394 70.6866 201.682 70.8306L212.138 76.8771C212.426 77.021 212.57 77.381 212.57 77.6689V89.7619Z" fill="white"/><path fillRule="evenodd" clipRule="evenodd" d="M317.125 77.3809C318.279 76.7331 318.928 75.5094 318.928 74.2137V65.6478C318.928 64.3522 318.207 63.1285 317.125 62.4806L286.769 44.9169C285.615 44.2691 284.245 44.2691 283.091 44.9169L252.518 62.5526C251.364 63.2004 250.643 64.4241 250.643 65.7198V100.919C250.643 102.215 251.364 103.439 252.518 104.086L282.875 121.362C284.028 122.01 285.398 122.01 286.48 121.362L304.867 111.141C305.444 110.853 305.805 110.205 305.805 109.557C305.805 108.909 305.444 108.261 304.867 107.973L274.15 90.3378C273.573 89.9778 273.212 89.402 273.212 88.7542V77.7409C273.212 77.093 273.573 76.4452 274.15 76.1573L283.74 70.6866C284.317 70.3267 285.038 70.3267 285.615 70.6866L295.205 76.1573C295.782 76.5172 296.142 77.093 296.142 77.7409V86.3787C296.142 87.0266 296.503 87.6744 297.08 87.9623C297.657 88.3223 298.378 88.3223 298.955 87.9623L317.125 77.3809Z" fill="white"/><path fillRule="evenodd" clipRule="evenodd" d="M284.461 75.7253C284.677 75.5814 284.966 75.5814 285.182 75.7253L291.023 79.1085C291.239 79.2525 291.383 79.4684 291.383 79.7564V86.5227C291.383 86.8106 291.239 87.0266 291.023 87.1705L285.182 90.5537C284.966 90.6977 284.677 90.6977 284.461 90.5537L278.62 87.1705C278.404 87.0266 278.26 86.8106 278.26 86.5227V79.7564C278.26 79.4684 278.404 79.2525 278.62 79.1085L284.461 75.7253Z" fill="#5FA04E"/><path d="M119.445 44.5068C118.271 43.8467 116.878 43.8467 115.705 44.5068L84.8332 62.3292C83.6599 62.9892 83 64.2361 83 65.5563V101.275C83 102.595 83.7332 103.841 84.8332 104.502L115.705 122.324C116.878 122.984 118.271 122.984 119.445 122.324L150.317 104.502C151.49 103.841 152.15 102.595 152.15 101.275V65.5563C152.15 64.2361 151.416 62.9892 150.317 62.3292L119.445 44.5068Z" fill="url(#paint0_linear_337_7901)"/><path d="M150.39 62.3292L119.371 44.5067C119.078 44.3601 118.711 44.2134 118.418 44.14L83.7378 103.55C84.0311 103.917 84.4937 104.452 84.8603 104.672L115.705 122.324C116.585 122.837 117.611 122.984 118.565 122.69L151.196 62.9892C150.976 62.6959 150.683 62.4759 150.39 62.3292Z" fill="url(#paint1_linear_337_7901)"/><path d="M150.314 104.502C151.194 103.988 151.987 103.026 151.987 101.866L118.195 44.0667C117.315 43.92 116.362 43.9934 115.555 44.5068L84.7567 62.2559L117.975 122.837C118.415 122.764 118.928 122.617 119.368 122.397L150.314 104.502Z" fill="url(#paint2_linear_337_7901)"/></g></g><defs><linearGradient id="paint0_linear_337_7901" x1="130.147" y1="57.7802" x2="102.227" y2="114.729" gradientUnits="userSpaceOnUse"><stop stopColor="#3F873F"/><stop offset="0.3296" stopColor="#3F8B3D"/><stop offset="0.6367" stopColor="#3E9638"/><stop offset="0.9341" stopColor="#3DA92E"/><stop offset="1" stopColor="#3DAE2B"/></linearGradient><linearGradient id="paint1_linear_337_7901" x1="112.883" y1="87.586" x2="191.215" y2="29.7213" gradientUnits="userSpaceOnUse"><stop offset="0.1376" stopColor="#3F873F"/><stop offset="0.4016" stopColor="#52A044"/><stop offset="0.7129" stopColor="#64B749"/><stop offset="0.9081" stopColor="#6ABF4B"/></linearGradient><linearGradient id="paint2_linear_337_7901" x1="81.8683" y1="83.4042" x2="153.304" y2="83.4042" gradientUnits="userSpaceOnUse"><stop offset="0.0919165" stopColor="#6ABF4B"/><stop offset="0.2871" stopColor="#64B749"/><stop offset="0.5984" stopColor="#52A044"/><stop offset="0.8624" stopColor="#3F873F"/></linearGradient><clipPath id="clip0_337_7901"><rect width="319" height="195" fill="white"/></clipPath></defs></svg>
          </em>
        </Link>
      </div>
      <div>
        <Link href="https://tsx.is" title="tsx" target="_blank" rel="noreferrer">
          <svg width={isMobile ? 33 : 90} height={isMobile ? 18 : 50} style={{ marginTop: isMobile ? '0' : '2px' }} xmlns="http://www.w3.org/2000/svg" fill="transparent" viewBox="0 0 319 135">
            <path fill="#B6B6B6" d="M158.026 24.8182v13.5227h-42.645V24.8182h42.645ZM125.909 7.04545h17.483V76.6875c0 2.3504.354 4.1534 1.063 5.4091.74 1.2235 1.706 2.0606 2.897 2.5114 1.192.4507 2.512.6761 3.96.6761 1.095 0 2.093-.0805 2.995-.2415.934-.161 1.642-.3059 2.125-.4346l2.946 13.6676c-.934.3219-2.27.6761-4.009 1.0625-1.706.3863-3.799.6117-6.278.6759-4.379.129-8.323-.531-11.832-1.9799-3.51-1.4811-6.295-3.7671-8.356-6.858-2.028-3.0909-3.026-6.9545-2.994-11.5909V7.04545Zm97.506 37.38065-15.937 1.7387c-.451-1.6099-1.24-3.1231-2.367-4.5398-1.094-1.4167-2.576-2.5597-4.443-3.429-1.867-.8693-4.153-1.304-6.858-1.304-3.638 0-6.697.7889-9.176 2.3665-2.447 1.5777-3.654 3.6222-3.622 6.1335-.032 2.1572.756 3.912 2.366 5.2642 1.642 1.3523 4.347 2.4631 8.114 3.3324l12.653 2.7046c7.019 1.5132 12.235 3.9119 15.648 7.196 3.445 3.2841 5.184 7.5824 5.216 12.8949-.032 4.6686-1.401 8.7898-4.105 12.3636-2.673 3.5417-6.391 6.3106-11.156 8.3068-4.766 1.9963-10.239 2.9945-16.421 2.9945-9.079 0-16.388-1.8998-21.926-5.699-5.538-3.8314-8.838-9.16-9.901-15.9858l17.049-1.642c.772 3.3484 2.414 5.8759 4.926 7.5823 2.511 1.7065 5.779 2.5597 9.804 2.5597 4.153 0 7.486-.8532 9.997-2.5597 2.544-1.7064 3.815-3.8153 3.815-6.3267 0-2.125-.821-3.8797-2.463-5.2642-1.61-1.3844-4.121-2.4469-7.534-3.1875l-12.653-2.6562c-7.116-1.4811-12.38-3.9763-15.793-7.4858-3.413-3.5417-5.103-8.0171-5.071-13.4261-.032-4.572 1.208-8.5322 3.719-11.8807 2.543-3.3807 6.069-5.9887 10.577-7.8239 4.539-1.8674 9.771-2.8011 15.696-2.8011 8.693 0 15.535 1.8513 20.525 5.5539 5.023 3.7027 8.13 8.7093 9.321 15.0199Zm23.506-19.6079 14.971 27.3835 15.213-27.3835h18.497l-22.36 37.0909L295.989 99h-18.401l-15.696-26.7074L246.341 99h-18.545l22.602-37.0909-22.023-37.0909h18.546Z"/>
            <g strokeLinecap="round" strokeWidth="24" clipPath="url(#a)">
              <path stroke="#3178C6" d="M12 122.672h80"/>
              <path stroke="#4CAE3D" d="m31.0667 11.9702 40.6061 39.0939-40.6061 39.0938"/>
            </g>
            <defs>
              <clipPath id="a">
                <path fill="#fff" d="M0 0h104v134.5H0z"/>
              </clipPath>
            </defs>
          </svg>
        </Link>
      </div>
      <div>
        <Link href="https://typestrong.org/ts-node" title="ts-node" target="_blank" rel="noreferrer">
          <Icon icon="logos:tsnode" size={isMobile ? 14 : 42} style={{ marginTop: isMobile ? '0' : '2px' }} />
        </Link>
      </div>
      <div>
        <Link href="https://deno.com" title="Deno" target="_blank" rel="noreferrer">
          <Icon icon="vscode-icons:file-type-deno" size={isMobile ? 20 : 48} />
        </Link>
      </div>
      <div>
        <Link href="https://bun.sh" title="Bun" target="_blank" rel="noreferrer">
          <Icon icon="logos:bun" size={isMobile ? 16 : 46} style={{ marginTop: isMobile ? '0' : '2px' }} />
        </Link>
      </div>
      <div>
        <Link href="https://www.python.org" title="Python" target="_blank" rel="noreferrer">
          <Icon icon="logos:python" size={isMobile ? 18 : 44} style={{ marginTop: isMobile ? '0' : '2px' }} />
        </Link>
      </div>
      <div>
        <Link href="https://golang.org" title="Go" target="_blank" rel="noreferrer">
          <Icon icon="logos:go" size={isMobile ? 14 : 42} style={{ marginTop: isMobile ? '3px' : '2px' }} />
        </Link>
      </div>
      <div>
        <Link href="https://www.rust-lang.org" title="Rust" target="_blank" rel="noreferrer">
          <Icon icon="vscode-icons:file-type-rust" size={isMobile ? 18 : 52} />
        </Link>
      </div>
      <div>
        <Link href="https://www.lua.org" title="Lua" target="_blank" rel="noreferrer">
          <Icon icon="logos:lua" size={isMobile ? 18 : 50} style={{ marginTop: isMobile ? '2px' : '2px' }} />
        </Link>
      </div>
      <div>
        <Link href="https://www.ruby-lang.org" title="Ruby" target="_blank" rel="noreferrer">
          <Icon icon="logos:ruby" size={isMobile ? 16 : 36} style={{ marginTop: isMobile ? '0' : '2px' }} />
        </Link>
      </div>
      <div>
        <Link href="https://www.perl.org" title="Perl" target="_blank" rel="noreferrer">
          <Icon icon="vscode-icons:file-type-perl" size={isMobile ? 18 : 44} style={{ marginTop: isMobile ? '0' : '2px' }} />
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
      text: 'arcadia',
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

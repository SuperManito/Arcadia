import React, { useMemo, useState, useEffect } from 'react'
import clsx from 'clsx'
import { ThreeDMarquee } from '../TreeDMarquee'
import { BlurFade } from '../BlurFade'
import { Safari } from '../Safari'
import { ConfigProvider, Image, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useColorMode, useWindowSize } from '@docusaurus/theme-common'
import styles from './index.module.css'

import ImgCodeEditLight from '@site/static/img/preview/code-edit-light.png'
import ImgCodeEditDark from '@site/static/img/preview/code-edit-dark.png'
import ImgCodeDebugLight from '@site/static/img/preview/code-debug-light.png'
import ImgCodeDebugDark from '@site/static/img/preview/code-debug-dark.png'
import ImgCronLight from '@site/static/img/preview/cron-light.png'
import ImgCronDark from '@site/static/img/preview/cron-dark.png'
import ImgLogLight from '@site/static/img/preview/log-light.png'
import ImgLogDark from '@site/static/img/preview/log-dark.png'
import ImgEnvLight from '@site/static/img/preview/env-light.png'
import ImgEnvDark from '@site/static/img/preview/env-dark.png'
import ImgFileLight from '@site/static/img/preview/file-light.png'
import ImgFileDark from '@site/static/img/preview/file-dark.png'
import ImgTerminalLight from '@site/static/img/preview/terminal-light.png'
import ImgTerminalDark from '@site/static/img/preview/terminal-dark.png'
import ImgLoginLight from '@site/static/img/preview/login-light.png'
import ImgLoginDark from '@site/static/img/preview/login-dark.png'

const LightImgs = [
  ImgCodeEditLight,
  ImgCodeDebugLight,
  ImgCronLight,
  ImgLogLight,
  ImgEnvLight,
  ImgFileLight,
  ImgTerminalLight,
  ImgLoginLight,
]

const DarkImgs = [
  ImgCodeEditDark,
  ImgCodeDebugDark,
  ImgCronDark,
  ImgLogDark,
  ImgEnvDark,
  ImgFileDark,
  ImgTerminalDark,
  ImgLoginDark,
]

const LightImgs2 = [
  ImgLoginLight,
  ImgCodeDebugLight,
  ImgCronLight,
  ImgLogLight,
  ImgEnvLight,
  ImgFileLight,
  ImgCodeEditLight,
  ImgFileLight,
  ImgEnvLight,
  ImgLogLight,
  ImgCronLight,
  ImgCodeDebugLight,
  ImgLoginLight,
  ImgCronLight,
  ImgCodeEditLight,
  ImgLogLight,
  ImgCodeDebugLight,
  ImgEnvLight,
  ImgCodeEditLight,
  ImgFileLight,
  ImgCodeEditLight,
  ImgFileLight,
  ImgEnvLight,
  ImgCronLight,
  ImgFileLight,
  ImgCodeDebugLight,
  ImgLoginLight,
  ImgCodeDebugLight,
  ImgLoginLight,
  ImgCronLight,
  ImgLogLight,
  ImgEnvLight,
  ImgCodeEditLight,
  ImgFileLight,
]

const DarkImgs2 = [
  ImgLoginDark,
  ImgCodeDebugDark,
  ImgCronDark,
  ImgLogDark,
  ImgEnvDark,
  ImgFileDark,
  ImgCodeEditDark,
  ImgFileDark,
  ImgEnvDark,
  ImgLogDark,
  ImgCronDark,
  ImgCodeDebugDark,
  ImgLoginDark,
  ImgCronDark,
  ImgCodeEditDark,
  ImgLogDark,
  ImgCodeDebugDark,
  ImgEnvDark,
  ImgCodeEditDark,
  ImgFileDark,
  ImgCodeEditDark,
  ImgFileDark,
  ImgEnvDark,
  ImgCronDark,
  ImgFileDark,
  ImgCodeDebugDark,
  ImgLoginDark,
  ImgCodeDebugDark,
  ImgLoginDark,
  ImgCronDark,
  ImgLogDark,
  ImgEnvDark,
  ImgCodeEditDark,
  ImgFileDark,
]

function ThreeDMarqueeComponents ({ onClick }: { onClick?: () => void }) {
  const { colorMode } = useColorMode()
  const images: any[] = colorMode === 'dark' ? [...DarkImgs2] : [...LightImgs2]
  return (
      <div
        className="mx-auto my-10 max-w-7xl rounded-3xl bg-gray-950/5 p-2 ring-1 ring-neutral-700/10 dark:bg-neutral-800 cursor-pointer"
        onClick={onClick}
      >
        <ThreeDMarquee images={images} />
      </div>
  )
}

function PreviewImageContainer ({
  children,
}: {
  children: React.ReactNode
}) {
  const { colorMode } = useColorMode()
  const algorithm = useMemo(() => {
    return colorMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm
  }, [colorMode])
  return (
    <ConfigProvider theme={{ algorithm }} locale={zhCN}>
        {children}
    </ConfigProvider>
  )
}

function PreviewImagesGroup () {
  const { colorMode } = useColorMode()
  const [previewImg, setPreviewImg] = useState(colorMode === 'dark' ? ImgCodeEditDark : ImgCodeEditLight)
  const [previewImgs, setPreviewImgs] = useState(colorMode === 'dark' ? DarkImgs : LightImgs)
  useEffect(() => {
    setPreviewImg(colorMode === 'dark' ? ImgCodeEditDark : ImgCodeEditLight)
    setPreviewImgs(colorMode === 'dark' ? DarkImgs : LightImgs)
  }, [colorMode])
  return (
    <Image.PreviewGroup
        items={previewImgs}
    >
        <Image src={previewImg} />
    </Image.PreviewGroup>
  )
}

function PreviewContentDefault () {
  const { colorMode } = useColorMode()
  const [previewImgs, setPreviewImgs] = useState(colorMode === 'dark' ? DarkImgs : LightImgs)
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    setPreviewImgs(colorMode === 'dark' ? DarkImgs : LightImgs)
  }, [colorMode])
  const [visible, setVisible] = useState(false)
  return (
    <div className="row">
        <span className='text-neutral-600 dark:text-[var(--ifm-color-emphasis-500)]' style={{ fontSize: 'var(--ifm-h2-font-size)', paddingTop: '1rem', width: '100%', textAlign: 'center' }}>
          <BlurFade delay={0.25} inView>
            <span className="font-bold tracking-tighter">
              现代化且高颜值的后台管理面板
            </span>
          </BlurFade>
        </span>
        <div className="pt-4 lg:pt-0 w-full m-auto">
            <ThreeDMarqueeComponents onClick={() => { setVisible(true) }} />
            <PreviewImageContainer>
                <div style={{ display: 'none' }}>
                    <Image.PreviewGroup
                    preview={{
                      visible,
                      current,
                      onVisibleChange: (vis) => { setVisible(vis) },
                      onChange: (curr) => { setCurrent(curr) },
                    }}
                    items={previewImgs}
                    />
                </div>
            </PreviewImageContainer>
        </div>
    </div>
  )
}

function PreviewContentMobile () {
  return (
    <div className="row" style={{ margin: '2em 0' }}>
      <div className="pt-4 lg:pt-0">
        <div className="relative">
          <Safari
            className="size-full"
          >
            <PreviewImageContainer>
              <PreviewImagesGroup/>
            </PreviewImageContainer>
          </Safari>
        </div>
      </div>
      <span className='text-neutral-600 dark:text-[var(--ifm-color-emphasis-500)]' style={{ fontSize: 'var(--ifm-h5-font-size)', paddingTop: '1rem', width: '100%', textAlign: 'center', color: 'var(--ifm-color-emphasis-500)' }}>
        现代化且高颜值的后台管理面板
      </span>
    </div>

  )
}

export default function Preview () {
  const windowSize = useWindowSize()
  const [initialWidth, setInitialWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth
    }
    return 1200
  })
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInitialWidth(window.innerWidth)
    }
  }, [])
  const isMobile = useMemo(() => {
    const widthBasedCheck = initialWidth < 768
    return windowSize === 'mobile' || widthBasedCheck
  }, [windowSize, initialWidth])

  return (
    <section className={clsx('container', styles.features)}>
      {!isMobile ? <PreviewContentDefault /> : <PreviewContentMobile />}
    </section>
  )
}

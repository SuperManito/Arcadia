import React, { useMemo, useState, useEffect } from 'react'
import clsx from 'clsx'
import { motion } from 'motion/react'
import ThreeDMarquee from './TreeDMarquee'
import BlurFade from '../BlurFade'
import Safari from './Safari'
import { ConfigProvider, Image, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useTheme } from '../../hooks/useTheme'
import { useWindowSize } from '../../hooks/useWindowSize'
import { useBaseUrls } from '../../hooks/useBaseUrl'
import styles from './index.module.css'

// 静态资源路径（相对于 /static 目录）
const LIGHT_IMAGE_PATHS = [
  '/images/preview/code-edit-light.png',
  '/images/preview/cron-dashboard-light.png',
  '/images/preview/cron-config-light.png',
  '/images/preview/log-light.png',
  '/images/preview/env-light.png',
  '/images/preview/file-light.png',
  '/images/preview/terminal-light.png',
  '/images/preview/login-light.png',
]

const DARK_IMAGE_PATHS = [
  '/images/preview/code-edit-dark.png',
  '/images/preview/cron-dashboard-dark.png',
  '/images/preview/cron-config-dark.png',
  '/images/preview/log-dark.png',
  '/images/preview/env-dark.png',
  '/images/preview/file-dark.png',
  '/images/preview/terminal-dark.png',
  '/images/preview/login-dark.png',
]

const marqueeIndices = [7, 1, 2, 3, 4, 5, 0, 5, 4, 3, 2, 1, 7, 2, 0, 3, 1, 4, 0, 5, 0, 5, 4, 2, 5, 1, 7, 1, 7, 2, 3, 4, 0, 5]

/**
 * 统一解析预览图片的静态资源 URL。
 */
function usePreviewImages () {
  const lightImgs = useBaseUrls(LIGHT_IMAGE_PATHS)
  const darkImgs = useBaseUrls(DARK_IMAGE_PATHS)
  const lightMarqueeImgs = useMemo(() => marqueeIndices.map(i => lightImgs[i]) as string[], [lightImgs])
  const darkMarqueeImgs = useMemo(() => marqueeIndices.map(i => darkImgs[i]) as string[], [darkImgs])
  return { lightImgs, darkImgs, lightMarqueeImgs, darkMarqueeImgs }
}

function ThreeDMarqueeComponents ({ onClick }: { onClick?: () => void }) {
  const { theme } = useTheme()
  const { lightMarqueeImgs, darkMarqueeImgs } = usePreviewImages()
  const images: string[] = theme === 'dark' ? darkMarqueeImgs : lightMarqueeImgs
  return (
      <div
        className="mx-auto my-10 max-w-7xl rounded-3xl border-4 border-neutral-200 dark:border-neutral-800 bg-transparent p-2 ring-1 ring-neutral-700/10 cursor-pointer"
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
  const { theme: currentTheme } = useTheme()
  const algorithm = useMemo(() => {
    return currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm
  }, [currentTheme])
  return (
    <ConfigProvider theme={{ algorithm }} locale={zhCN}>
        {children}
    </ConfigProvider>
  )
}

function PreviewImagesGroup () {
  const { theme } = useTheme()
  const { lightImgs, darkImgs } = usePreviewImages()
  const [previewImg, setPreviewImg] = useState(theme === 'dark' ? darkImgs[0] : lightImgs[0])
  const [previewImgs, setPreviewImgs] = useState(theme === 'dark' ? darkImgs : lightImgs)
  useEffect(() => {
    setPreviewImg(theme === 'dark' ? darkImgs[0] : lightImgs[0])
    setPreviewImgs(theme === 'dark' ? darkImgs : lightImgs)
  }, [theme, lightImgs, darkImgs])
  return (
    <Image.PreviewGroup
        items={previewImgs}
    >
        <Image src={previewImg} />
    </Image.PreviewGroup>
  )
}

function PreviewContentDefault () {
  const { theme } = useTheme()
  const { lightImgs, darkImgs } = usePreviewImages()
  const [previewImgs, setPreviewImgs] = useState(theme === 'dark' ? darkImgs : lightImgs)
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    setPreviewImgs(theme === 'dark' ? darkImgs : lightImgs)
  }, [theme, lightImgs, darkImgs])
  const [visible, setVisible] = useState(false)
  return (
    <div className="row">
        <span className='text-neutral-600 dark:text-(--ifm-color-emphasis-500)' style={{ fontSize: 'var(--ifm-h2-font-size)', width: '100%', textAlign: 'center' }}>
          <BlurFade delay={0.25} inView>
            <span className="font-bold tracking-tighter">
              兼具美感与现代化的控制面板
            </span>
          </BlurFade>
        </span>
        <div className="pt-4 lg:pt-0 w-full m-auto">
            <ThreeDMarqueeComponents onClick={() => { setVisible(true) }} />
            <PreviewImageContainer>
                <div style={{ display: 'none' }}>
                    <Image.PreviewGroup
                    preview={{
                      open: visible,
                      current,
                      onOpenChange: (vis) => { setVisible(vis) },
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
      <span className='text-neutral-600 dark:text-(--ifm-color-emphasis-500)' style={{ fontSize: 'var(--ifm-h5-font-size)', paddingTop: '1rem', width: '100%', textAlign: 'center', color: 'var(--ifm-color-emphasis-500)' }}>
        兼具美感与现代化的控制面板
      </span>
    </div>

  )
}

export default function Preview () {
  const { isMobile } = useWindowSize()

  return (
    <div className="sm:py-12 bg-white dark:bg-neutral-950 border-neutral-100 dark:border-neutral-900 overflow-hidden">
      <div className="container mx-auto px-2 sm:px-4 max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="w-full justify-center flex"
        >
          <section className={clsx('w-full', styles.features)}>
            {!isMobile ? <PreviewContentDefault /> : <PreviewContentMobile />}
          </section>
        </motion.div>
      </div>
    </div>
  )
}

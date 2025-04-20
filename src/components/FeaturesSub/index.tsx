import React, { type ComponentPropsWithoutRef, type CSSProperties, useEffect, useRef, useState } from 'react'
import cn from '../lib/utils'
import IconCloud from '../IconCloud'
import { motion } from 'motion/react'

interface RippleProps extends ComponentPropsWithoutRef<'div'> {
  mainCircleSize?: number
  mainCircleOpacity?: number
  numCircles?: number
}

export const Ripple = React.memo(function Ripple ({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
  ...props
}: RippleProps) {
  return (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 select-none [mask-image:linear-gradient(to_bottom,white,transparent)]',
            className,
          )}
          {...props}
        >
          {Array.from({ length: numCircles }, (_, i) => {
            const size = mainCircleSize + i * 70
            const opacity = mainCircleOpacity - i * 0.03
            const animationDelay = `${i * 0.06}s`
            const borderStyle = i === numCircles - 1 ? 'dashed' : 'solid'
            const borderOpacity = 5 + i * 5

            return (
              <div
                key={i}
                className={'absolute animate-ripple rounded-full border bg-foreground/25 shadow-xl'}
                style={
                  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                  {
                    '--i': i,
                    width: `${size}px`,
                    height: `${size}px`,
                    opacity,
                    animationDelay,
                    borderStyle,
                    borderWidth: '1px',
                    borderColor: `hsl(var(--foreground), ${borderOpacity / 100})`,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) scale(1)',
                  } as CSSProperties
                }
              />
            )
          })}
        </div>
  )
})

Ripple.displayName = 'Ripple'
export default function FeaturesSub () {
  const containerRef = useRef(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scrollY, setScrollY] = useState(0)

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const rect = (containerRef.current as any).getBoundingClientRect()
        const windowHeight = window.innerHeight
        if (rect.top < windowHeight && rect.bottom > 0) {
          const visiblePercent = 1 - Math.max(0, Math.min(1, rect.top / (windowHeight - rect.height / 2)))
          setScrollY(visiblePercent)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => { window.removeEventListener('scroll', handleScroll) }
  }, [])

  // 使用 useMemo 缓存 IconCloud 组件实例，避免每次滚动都重新创建
  const memoizedIconCloud = React.useMemo(() => <IconCloud />, [])

  return (
      <section className='container'>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <motion.div
            className="bg-white dark:bg-[var(--ifm-color-emphasis-100)] rounded-2xl shadow-md overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="p-6 md:p-8">
              <span className="text-2xl md:text-3xl font-bold text-[var(--ifm-color-primary)] mb-4 flex items-center">
                <svg className="w-8 h-8 mr-2 text-[var(--ifm-color-primary)]" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M14 2H6C4.89 2 4 2.9 4 4V20C4 21.11 4.89 22 6 22H18C19.11 22 20 21.11 20 20V8L14 2M18 20H6V4H13V9H18V20M10 19L12 15H9V10L7 14H10V19Z" />
                </svg>
                在线编辑，轻松驾驭~
              </span>
              <p className="text-base md:text-lg text-gray-600 dark:text-[var(--ifm-color-emphasis-700)] mb-6">
                平台支持在线编辑丰富的文件格式，一站式处理各类文件。语法高亮让编辑体验更加流畅高效，无缝协作，随时随地编辑您的内容。
              </p>
            </div>

            <div className="flex justify-center items-center h-[326px] md:h-[448px] p-6 bg-[var(--ifm-color-emphasis-100)] dark:bg-[var(--ifm-color-emphasis-100)]">
              {/* 使用缓存的 IconCloud 组件 */}
              {memoizedIconCloud}
            </div>
          </motion.div>

        <motion.div
          className="bg-white dark:bg-[var(--ifm-color-emphasis-100)] rounded-2xl shadow-md overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
        >
          <div className="p-6 md:p-8">
            <span className="text-2xl md:text-3xl font-bold text-[var(--ifm-color-primary)] mb-4 flex items-center">
              <svg className="w-8 h-8 mr-2 text-[var(--ifm-color-primary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11 15H6L13 1V9H18L11 23V15Z" />
              </svg>
              快，框不住！
            </span>
            <p className="text-base md:text-lg text-gray-600 dark:text-[var(--ifm-color-emphasis-700)] mb-6">
                高性能、低占用是 Arcadia 的特色之一。运行代码延迟控制在了 0.2 秒以内，后端数据库由 Rust 驱动并采用 ORM 先进架构，查询响应飞快。
            </p>
          </div>

          <div
            ref={containerRef}
            className="flex justify-center items-center flex-grow h-[326px] md:h-[448px] relative overflow-hidden bg-[var(--ifm-color-emphasis-100)] dark:bg-[var(--ifm-color-emphasis-100)]"
          >
            <Ripple mainCircleSize={180} mainCircleOpacity={0.15} />
            <div className="lightning-container absolute z-10">
              <div className="lightning">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 257" className="lightning-svg">
                  <path
                    d="M99 52 L160 52 L143 106 L183 106 L86 205 L96 152 L59 152 Z"
                    fill="currentColor"
                    className="lightning-path"
                  />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .lightning-container {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 180px;
          height: 180px;
          z-index: 10;
        }
        .lightning {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .lightning::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 65, 60, 0.15) 0%, rgba(255, 125, 0, 0) 70%);
          z-index: 1;
          animation: pulse 2s infinite;
        }
        [data-theme='dark'] .lightning::after {
          background: radial-gradient(circle, rgba(255, 225, 60, 0.15) 0%, rgba(255, 215, 0, 0) 70%);
        }
        .lightning-svg {
          width: 80px;
          height: 80px;
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8));
        }
        .lightning-path {
          color: #FFAF00;
          animation: glow 2s infinite;
        }
        [data-theme='dark'] .lightning-path {
          color: #FFD700;
        }
        @keyframes glow {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.8));
            opacity: 0.95;
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(255, 215, 0, 1)) drop-shadow(0 0 20px rgba(255, 215, 0, 0.7));
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }
      `}</style>
    </section>
  )
}

import React from 'react'
import { motion } from 'motion/react'
import { Icon } from '../Icon'
import { languageIcons } from './data'

export default function EcosystemSection () {
  return (
    <div className="md:mt-24 py-10 md:py-24 bg-white dark:bg-neutral-950 relative overflow-hidden border-neutral-100 dark:border-neutral-900">
      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        <div className="flex flex-col lg:flex-row items-center gap-0 md:gap-16">
          {/* 左侧文字介绍 */}
          <motion.div
            className="w-full lg:w-5/12 text-center lg:text-left shrink-0"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="inline-block px-3 py-1 mb-4 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold tracking-wider uppercase">
              Language Ecosystem
            </div>
            <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white mb-6 leading-tight">
              广泛的语言格式生态
            </div>
            <div className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 md:mb-8 leading-relaxed text-justify">
              平台支持各种主流编程语言与文件类型，并配有强大的语法高亮和精美图标。抛弃繁杂的本地环境配置文件，凭借若隐若现的无界拓展能力，让您始终专注于代码本身，而非工具的切换与适配。
            </div>
          </motion.div>

          {/* 右侧卡片矩阵 (若隐若现无界渐变效果) */}
          <motion.div
            className="w-full lg:w-7/12 relative flex justify-center lg:justify-end mt-10 lg:mt-0"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="w-full relative max-w-[650px] flex items-center justify-center py-6 sm:p-6">
              {/* 炫彩散光背景 */}
              <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                <div className="absolute w-[200px] md:w-[350px] h-[50px] md:h-[200px] bg-blue-500/20 dark:bg-blue-600/30 rounded-full blur-[60px] sm:blur-[100px]"></div>
                <div className="absolute w-[150px] md:w-[300px] h-[25px] md:h-[150px] bg-purple-500/20 dark:bg-purple-600/20 rounded-full blur-[60px] sm:blur-[100px] translate-x-10 translate-y-10"></div>
              </div>

              {/* Flex 排列 + 径向渐变遮罩 */}
              <div
                className="flex flex-wrap justify-center gap-3 sm:gap-5 relative z-10 w-full"
                style={{
                  WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at center, black 40%, rgba(0,0,0,0.2) 80%, transparent 100%)',
                  maskImage: 'radial-gradient(ellipse 70% 50% at center, black 40%, rgba(0,0,0,0.2) 80%, transparent 100%)',
                }}
              >
                {languageIcons.map((item, idx) => (
                  <div
                    key={idx}
                    title={item.name}
                    className="group flex flex-col items-center justify-center w-8 h-8 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-white/50 dark:border-white/5 shadow-sm hover:shadow-xl hover:bg-white/80 dark:hover:bg-neutral-800/80 hover:scale-110 hover:-translate-y-2 transition-all duration-300 cursor-pointer"
                  >
                    <div className="transform transition-transform text-xl sm:text-2xl md:text-3xl text-neutral-700 dark:text-neutral-200 group-hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]">
                      <Icon icon={item.icon} color={item.color} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}

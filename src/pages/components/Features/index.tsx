import React from 'react'
import Link from '@docusaurus/Link'
import { cn } from '../lib/utils'
import { Icon } from '../../../components/Icon'

function FeatureComponent ({
  title,
  description,
  icon,
  index,
}: {
  title: string
  description: any
  icon: React.ReactNode
  index: number
}) {
  return (
    <div
      className={cn(
        'flex flex-col lg:border-r py-4 lg:py-10 relative group/feature dark:border-neutral-800',
        (index === 0 || index === 4) && 'lg:border-l dark:border-neutral-800',
        index < 4 && 'lg:border-b dark:border-neutral-800',
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-linear-to-t from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-linear-to-b from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400 group-hover/feature:text-[var(--ifm-color-primary)]">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-[var(--ifm-color-primary)] transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  )
}

export default function Feature () {
  const features = [
    {
      title: '专业代码编辑器',
      description: (
        <>
          采用 <b><Link href="https://code.visualstudio.com" target="_blank" rel="noreferrer">VS Code</Link></b> 核心组件之一的摩纳哥编辑器，并且经过了高度定制，提供众多语言解释器支持，代码高亮效果与桌面客户端一致，支持标签页多开。
        </>
      ),
      icon: <Icon icon="mdi:microsoft-visual-studio-code" size={24} />,
    },
    {
      title: '定时任务调度',
      description: (
        <>
          支持秒级任务与并发任务，设有卡片和数据表格两种布局，增删改查一应俱全，可直接查看任务关联的历史运行日志和源码，支持调试、过滤、排序等功能。
        </>
      ),
      icon: <Icon icon="tabler:clock-play" size={24} />,
    },
    {
      title: '环境变量可视化',
      description: (
        <>
          通过数据表格页面管理底层环境变量，增删改查一应俱全，支持变量聚合、编排，支持排序。
        </>
      ),
      icon: <Icon icon="tabler:variable" size={24} />,
    },
    {
      title: '运行日志展示与查询',
      description: (
        <>
          支持内容高亮、实时滚动更新、滚动至底/顶、调整字体大小、名称过滤、日期范围过滤等功能，还支持反转、轮询等高级功能。
        </>
      ),
      icon: <Icon icon="mdi:text-box-search-outline" size={24} />,
    },
    {
      title: '文件可视化管理',
      description: (
        <>
          仿桌面系统的文件管理页面，设有平铺和列表两种视图，支持创建、删除、重命名、上传、下载、删除、预览、编辑等操作。
        </>
      ),
      icon: <Icon icon="mdi:folder-open-outline" size={24} />,
    },
    {
      title: '代码内容对比',
      description: (
        <>
          集成摩纳哥专业差异编辑器，可任意选择对比文件。
        </>
      ),
      icon: <Icon icon="mdi:file-compare" size={24} />,
    },
    {
      title: '代码在线调试',
      description: (
        <>
          专业的调试工具，通过 WebSocket 实施反馈运行日志，支持配置调试环境。
        </>
      ),
      icon: <Icon icon="mdi:script-text-play-outline" size={24} />,
    },
    {
      title: '内置终端命令行',
      description: (
        <>
          集成了基于 <b><Link href="https://xtermjs.org/" target="_blank" rel="noreferrer">Xterm.js</Link></b> 的 WEB 终端工具，实时、流畅且支持标签页多开，日常使用无需手动连接至服务端。
        </>
      ),
      icon: <Icon icon="heroicons-outline:terminal" size={24} />,
    },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <FeatureComponent key={feature.title} {...feature} index={index} />
      ))}
    </div>
  )
}

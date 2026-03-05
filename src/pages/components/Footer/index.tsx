import React from 'react'
import Link from '../Link'

export default function Footer () {
  const logoDark = '/images/logo/arcadia-dark-sub.png'
  const logoLight = '/images/logo/arcadia-light-sub.png'

  return (
    <footer className="mt-12 md:mt-24 py-12 sm:py-16 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 lg:gap-16 mb-12">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4 sm:mb-6">学习</span>
            <ul className="space-y-3">
              <li>
                <Link className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="/docs">Arcadia 介绍</Link>
              </li>
              <li>
                <Link className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="/docs/start/install">安装流程</Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4 sm:mb-6">社区</span>
            <ul className="space-y-3">
              <li>
                <Link className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="http://issue.arcadia.cool/?lang=zh-CN">Issue</Link>
              </li>
              <li>
                <Link className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="https://t.me/ArcadiaPanelGroup">官方群组</Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4 sm:mb-6">链接</span>
            <ul className="space-y-3">
              <li>
                <Link className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="https://github.com/SuperManito/Arcadia">GitHub</Link>
              </li>
              <li>
                <Link className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="https://t.me/ArcadiaPanel">官方频道</Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4 sm:mb-6">资源</span>
            <ul className="space-y-3">
              <li>
                <Link className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="/blog">博客</Link>
              </li>
              <li>
                <Link className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href="/docs/dev/api">开发者文档</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center pt-8 border-t border-neutral-100 dark:border-neutral-900/50">
          <div className="mb-6">
            <img className="h-8 md:h-10 block dark:hidden select-none" alt="Arcadia Logo" draggable={false} src={logoLight} />
            <img className="h-8 md:h-10 hidden dark:block select-none" alt="Arcadia Logo" draggable={false} src={logoDark} />
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-500">
            Copyright © {new Date().getFullYear()} SuperManito
          </div>
        </div>
      </div>
    </footer>
  )
}

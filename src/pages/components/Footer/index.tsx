import React, { useState, useEffect } from 'react'
import { useColorMode } from '@docusaurus/theme-common'
import Heading from '@theme/Heading'
import Link from '@docusaurus/Link'

export default function Footer () {
  const logoDark = '/img/logo/arcadia-dark-sub.png'
  const logoLight = '/img/logo/arcadia-light-sub.png'
  const { colorMode } = useColorMode()
  const [logo, setLogo] = useState(colorMode === 'dark' ? logoDark : logoLight)
  useEffect(() => {
    setLogo(colorMode === 'dark' ? logoDark : logoLight)
  }, [colorMode])
  return (
    <footer className="footer mt-16 lg:mt-44">
      <div className="container container--fluid">
        <div className="row footer__links">
          <div className="col footer__col">
            <Heading as="h4" className="footer__title">学习</Heading>
            <ul className="footer__items">
              <li className="footer__item">
                <Link className="footer__link-item" href="/docs">Arcadia 介绍</Link>
              </li>
              <li className="footer__item">
                <Link className="footer__link-item" href="/docs/start/install">安装流程</Link>
              </li>
            </ul>
          </div>
          <div className="col footer__col">
            <Heading as="h4" className="footer__title">社区</Heading>
            <ul className="footer__items">
              <li className="footer__item">
                <Link className="footer__link-item" href="http://issue.arcadia.cool/?lang=zh-CN">Issue</Link>
              </li>
              <li className="footer__item">
                <Link className="footer__link-item" href="https://t.me/ArcadiaPanelGroup">官方群组</Link>
              </li>
            </ul>
          </div>
          <div className="col footer__col">
            <Heading as="h4" className="footer__title">更多</Heading>
            <ul className="footer__items">
              <li className="footer__item">
                <Link className="footer__link-item" href="https://github.com/SuperManito/Arcadia">GitHub</Link>
              </li>
              <li className="footer__item">
                <Link className="footer__link-item" href="https://t.me/ArcadiaPanel">官方频道</Link>
              </li>
            </ul>
          </div>
          <div className="col footer__col">
            <Heading as="h4" className="footer__title">更多</Heading>
            <ul className="footer__items">
              <li className="footer__item">
                <Link className="footer__link-item" href="/blog">博客</Link>
              </li>
              <li className="footer__item">
                <Link className="footer__link-item" href="/docs/dev/api">开发者文档</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="text--center">
          <div className="margin-bottom--sm">
            <img
              className="footer__logo h-10 mt-2 mb-10 lg:mt-10 lg:mb-10 m-auto"
              alt="Arcadia Logo"
              src={logo} />
          </div>
          Copyright © {new Date().getFullYear()} SuperManito
        </div>
      </div>
    </footer>
  )
}

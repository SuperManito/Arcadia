import React from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import Heading from '@theme/Heading'
import Link from '@docusaurus/Link'
import { useColorMode } from '@docusaurus/theme-common'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import HomePageFeatures from '../components/HomePageFeatures/index'
import styles from './index.module.css'

function Hero () {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Logo = require('@site/static/img/logo/arcadia-pure-logo.png').default
  return (
        <header className={clsx('container', styles.heroBanner)}>
            <div className="row padding-horiz--md">
                <div className="col col--7">
                    <div className={clsx(styles.relative, 'row')}>
                        <div className="col">
                            <Heading as="h1" className={styles.tagline}>
                                <br />
                                Arcadia
                                <br /> 一站式代码运维平台
                            </Heading>
                            <Heading as="h1" className={styles.tagline}>
                                <span>
                                    <br />
                                    Arcadia
                                    <br />
                                </span>{' '}
                                一站式代码运维平台
                            </Heading>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col">
                            <Heading as="h2">高效 易用 简约 漂亮 稳定 安全</Heading>
                        </div>
                    </div>
                    <div>
                        <Link className="button button--block button--primary button--outline button--lg" to="/docs/start/install">
                            开 始 使 用
                        </Link>
                    </div>
                </div>
                <div className={clsx(styles.relative, 'col', 'col--5')}>
                    <div className={styles.logoBlur}>
                        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800" opacity="1">
                            <defs>
                                <filter id="bbblurry-filter" x="-100%" y="-100%" width="400%" height="400%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                    <feGaussianBlur stdDeviation="77" x="0%" y="0%" width="100%" height="100%" in="SourceGraphic" edgeMode="none" result="blur"></feGaussianBlur>
                                </filter>
                            </defs>
                            <g filter="url(#bbblurry-filter)">
                                <ellipse rx="78.5" ry="80" cx="511.3427734375" cy="474.40447998046875" fill="#9b24ffff"></ellipse>
                                <ellipse rx="78.5" ry="80" cx="512.676306439944" cy="299.23062005966744" fill="#684ae3ff"></ellipse>
                                <ellipse rx="78.5" ry="80" cx="452.3887306732656" cy="396.6923141080048" fill="#ef0bbaff"></ellipse>
                                <ellipse rx="78.5" ry="80" cx="339.2578494086939" cy="302.0300610926763" fill="#0094ffff"></ellipse>
                                <ellipse rx="78.5" ry="80" cx="335.5279350879929" cy="473.333784812408" fill="#002dffff"></ellipse>
                            </g>
                        </svg>
                    </div>
                    <div className={styles.logo} style={{ userSelect: 'none' }}>
                        <img src={Logo} className={clsx(styles.hideSmall)} draggable="false" />
                    </div>
                </div>
            </div>
        </header>
  )
}

function Features () {
  const { colorMode } = useColorMode()
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const previewImg = colorMode === 'dark' ? require('./dark.png').default : require('./light.png').default
  return (
        <section className={clsx('container', styles.features)}>
            <div className="row">
                <div className="col col--6">
                    <Heading as="h2">面板技术引擎</Heading>
                    <div className="avatar" style={{ padding: '1em 0' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 312">
                            <path fill="#4C9717" d="M181.252 154.622c.173-1.039.268-2.09.283-3.143v98.197l-51.453-47.052l-25.886-23.607l-15.582-14.324l-6.927-6.323l-2.552-2.33l-.185-.16c-.629-.506-1.233-1.036-1.812-1.517c-.58-.48-1.085-.9-1.775-.69a1.54 1.54 0 0 0-.974 1.11V62.33l.53.481l10.564 9.553c5.56 4.931 11.169 9.862 16.716 14.793a3585.593 3585.593 0 0 1 23.594 21.326c6.204 5.637 12.4 11.283 18.589 16.937c7.396 6.743 14.693 13.56 22.09 20.253c3.328 3.008 6.68 5.954 10.046 8.912c.715.629 1.418 1.233 2.145 1.874c.5.363 1.15.447 1.726.222c.341-.19.59-.51.69-.888c.099-.468.099-.789.173-1.17Z" />
                            <path fill="#5FBC21" d="M74.278 155.325c-.14 1.12-.18 2.25-.123 3.378c0 31.433 0 62.867.234 94.289v11.192a18.306 18.306 0 0 1-7.236 13.671c-8.394 7.014-16.222 14.681-24.32 22.053c-3.39 3.082-6.756 6.163-10.245 9.171c-3.488 3.008-12.462 3.378-17.43-.776a96.654 96.654 0 0 1-10.527-10.676a15.73 15.73 0 0 1-4.598-10.712c0-.887-.074-1.861 0-2.933c0-1.85 0-3.699.062-5.56c.061-5.3 0-10.613 0-15.914V89.635a15.547 15.547 0 0 1 .468-3.92c.327-1.115.74-2.203 1.233-3.255a27.317 27.317 0 0 1 2.49-4.413l19.723-19.723L36.57 45.775a9.664 9.664 0 0 1 2.268-1.7a9.923 9.923 0 0 1 3.957-1.234c4.126-.76 8.386.026 11.97 2.207c.919.56 1.781 1.209 2.576 1.935l17.048 15.31v92.453a4.05 4.05 0 0 0-.11.579Zm179.123 75.453l-36.229 33.283c-.142.107-.29.206-.443.296l-.136.099l-.247.148a17.258 17.258 0 0 1-20.66-2.034l-2.181-1.911l-12.02-10.983V46.453a64.03 64.03 0 0 1 .827-5.103c.863-4.376 4.709-6.546 7.642-9.282c6.373-5.917 12.944-11.612 19.44-17.406c4.475-3.994 8.937-8 13.449-11.97c3.932-3.463 11.55-3.29 15.248-1.146a12.41 12.41 0 0 1 2.564 1.985l4.167 4.018l3.365 3.218l3.07 2.97a14.114 14.114 0 0 1 2.194 2.577a14.46 14.46 0 0 1 2.095 7.963c-.061 18.071.074 36.143.111 54.239c.074 30.694.14 61.388.197 92.082c0 15.73.03 31.454.087 47.175v2.158c.185 4.684.086 7.778-2.54 10.847Z" />
                        </svg>
                        <div className="avatar__intro">
                            <div className="avatar__name">Naive UI</div>
                        </div>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.0041 37.0001H8.52816C8.42088 37 8.31487 36.9769 8.21728 36.9324C8.11969 36.8879 8.03278 36.8229 7.9624 36.7419C7.89203 36.661 7.83983 36.5659 7.80932 36.463C7.77881 36.3602 7.7707 36.252 7.78553 36.1457L9.04719 29.0229H17.0324L15.7308 36.4013C15.6962 36.569 15.6052 36.7199 15.4731 36.8288C15.3409 36.9378 15.1754 36.9982 15.0041 37.0001Z" fill="#009BFF" />
                            <path d="M33.2341 12.9885H11.8657L13.2711 5.00336H34.352C34.4674 4.99234 34.5839 5.0085 34.6919 5.05056C34.8 5.09262 34.8967 5.1594 34.9744 5.24556C35.052 5.33172 35.1083 5.43486 35.1389 5.54672C35.1695 5.65858 35.1735 5.77605 35.1505 5.88972L33.9687 12.3897C33.9367 12.5602 33.8454 12.7138 33.7109 12.8234C33.5764 12.933 33.4075 12.9915 33.2341 12.9885Z" fill="url(#paint0_linear_736_105)" />
                            <path d="M11.8658 12.9874H4.75899C4.65026 12.9886 4.54257 12.9662 4.44336 12.9217C4.34416 12.8772 4.25581 12.8116 4.18442 12.7296C4.11304 12.6476 4.06032 12.551 4.02993 12.4467C3.99953 12.3423 3.99218 12.2325 4.00838 12.125L5.16623 5.61706C5.19786 5.44503 5.28858 5.28945 5.42271 5.17719C5.55684 5.06493 5.72596 5.00303 5.90087 5.0022H13.2712L11.8658 12.9874Z" fill="#0064FF" />
                            <path d="M17.0402 28.9987H9.03906L11.8658 13.0044H19.867L17.0402 28.9987Z" fill="url(#paint1_linear_736_105)" />
                            <defs>
                                <linearGradient id="paint0_linear_736_105" x1="12.551" y1="9.00394" x2="33.8598" y2="12.8395" gradientUnits="userSpaceOnUse">
                                    <stop offset="0.03" stopColor="#E9FFFF" />
                                    <stop offset="0.17" stopColor="#C4FAC9" />
                                    <stop offset="0.33" stopColor="#A0F694" />
                                    <stop offset="0.48" stopColor="#82F269" />
                                    <stop offset="0.63" stopColor="#6AEF47" />
                                    <stop offset="0.76" stopColor="#5AED2F" />
                                    <stop offset="0.89" stopColor="#4FEB20" />
                                    <stop offset="1" stopColor="#4CEB1B" />
                                </linearGradient>
                                <linearGradient id="paint1_linear_736_105" x1="15.8567" y1="12.4215" x2="16.0078" y2="27.4702" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#009BFF" />
                                    <stop offset="0.35" stopColor="#0081FE" />
                                    <stop offset="0.75" stopColor="#006AFD" />
                                    <stop offset="1" stopColor="#0062FD" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="avatar__intro">
                            <div className="avatar__name">TDesign</div>
                        </div>
                    </div>
                    <div className="avatar" style={{ padding: '1em 0' }}>
                        <svg viewBox="0 0 128 128" width="32" height="32" data-v-ff3ee1d1="">
                            <path fill="#42b883" d="M78.8,10L64,35.4L49.2,10H0l64,110l64-110C128,10,78.8,10,78.8,10z" data-v-ff3ee1d1=""></path>
                            <path fill="#35495e" d="M78.8,10L64,35.4L49.2,10H25.6L64,76l38.4-66H78.8z" data-v-ff3ee1d1=""></path>
                        </svg>
                        <div className="avatar__intro">
                            <div className="avatar__name">Vue</div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
                            <path fill="#3178C6" d="M20 0h216c11.046 0 20 8.954 20 20v216c0 11.046-8.954 20-20 20H20c-11.046 0-20-8.954-20-20V20C0 8.954 8.954 0 20 0Z" />
                            <path fill="#FFF" d="M150.518 200.475v27.62c4.492 2.302 9.805 4.028 15.938 5.179c6.133 1.151 12.597 1.726 19.393 1.726c6.622 0 12.914-.633 18.874-1.899c5.96-1.266 11.187-3.352 15.678-6.257c4.492-2.906 8.048-6.704 10.669-11.394c2.62-4.689 3.93-10.486 3.93-17.391c0-5.006-.749-9.394-2.246-13.163a30.748 30.748 0 0 0-6.479-10.055c-2.821-2.935-6.205-5.567-10.149-7.898c-3.945-2.33-8.394-4.531-13.347-6.602c-3.628-1.497-6.881-2.949-9.761-4.359c-2.879-1.41-5.327-2.848-7.342-4.316c-2.016-1.467-3.571-3.021-4.665-4.661c-1.094-1.64-1.641-3.495-1.641-5.567c0-1.899.489-3.61 1.468-5.135s2.362-2.834 4.147-3.927c1.785-1.094 3.973-1.942 6.565-2.547c2.591-.604 5.471-.906 8.638-.906c2.304 0 4.737.173 7.299.518c2.563.345 5.14.877 7.732 1.597a53.669 53.669 0 0 1 7.558 2.719a41.7 41.7 0 0 1 6.781 3.797v-25.807c-4.204-1.611-8.797-2.805-13.778-3.582c-4.981-.777-10.697-1.165-17.147-1.165c-6.565 0-12.784.705-18.658 2.115c-5.874 1.409-11.043 3.61-15.506 6.602c-4.463 2.993-7.99 6.805-10.582 11.437c-2.591 4.632-3.887 10.17-3.887 16.615c0 8.228 2.375 15.248 7.127 21.06c4.751 5.811 11.963 10.731 21.638 14.759a291.458 291.458 0 0 1 10.625 4.575c3.283 1.496 6.119 3.049 8.509 4.66c2.39 1.611 4.276 3.366 5.658 5.265c1.382 1.899 2.073 4.057 2.073 6.474a9.901 9.901 0 0 1-1.296 4.963c-.863 1.524-2.174 2.848-3.93 3.97c-1.756 1.122-3.945 1.999-6.565 2.632c-2.62.633-5.687.95-9.2.95c-5.989 0-11.92-1.05-17.794-3.151c-5.875-2.1-11.317-5.25-16.327-9.451Zm-46.036-68.733H140V109H41v22.742h35.345V233h28.137V131.742Z" />
                        </svg>
                        <div className="avatar__intro">
                            <div className="avatar__name">TypeScript</div>
                        </div>
                    </div>
                    <br />
                    <span style={{ marginTop: '10px' }}>后台管理面板采用前沿技术编写，界面简洁美观，功能强大。</span>
                </div>
                <div className="col col--6">
                    <div className="video-container">
                        <img src={previewImg} className={clsx(styles.hideSmall)} />
                    </div>
                </div>
            </div>
        </section>
  )
}

function Footer () {
  return (
        <footer className="footer">
            <div className="container container--fluid">
                <div className="text--center">Copyright © {new Date().getFullYear()} SuperManito</div>
            </div>
        </footer>
  )
}

export default function Home () {
  const { siteConfig } = useDocusaurusContext() as any
  return (
        <Layout title={`${siteConfig.title as string} · ${siteConfig.tagline as string}`} description={siteConfig.description}>
            <Hero />
            <Features />
            <HomePageFeatures />
            <Footer />
        </Layout>
  )
}

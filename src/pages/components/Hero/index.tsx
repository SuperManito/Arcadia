import React from 'react'
import clsx from 'clsx'
import Heading from '@theme/Heading'
import Link from '@docusaurus/Link'
import { useWindowSize } from '@docusaurus/theme-common'
import styles from '../index.module.css'

export default function Hero () {
  const isMobile = useWindowSize() === 'mobile'
  return (
        <header className={clsx('container', styles.heroBanner)}>
            <div className="row padding-horiz--md">
                <div className="col col--7 lg:mt-[6.5rem]">
                    <div className={clsx(styles.relative, 'row')}>
                        <div className="col" style={{ userSelect: 'none' }}>
                            <Heading as="h1" className={styles.tagline}>
                                <span>
                                    Arcadia <span style={{ fontSize: '1rem' }}>阿卡迪亚</span>
                                    <br className="block" />
                                </span>{' '}
                                一站式代码运维平台
                            </Heading>
                            <Heading as="h1" className={styles.tagline}>
                                <span>
                                    Arcadia <span style={{ fontSize: '1rem' }}>阿卡迪亚</span>
                                    <br className="block" />
                                </span>{' '}
                                一站式代码运维平台
                            </Heading>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col" style={{ userSelect: 'none' }}>
                            <Heading as={!isMobile ? 'h2' : 'h4'}>
                                高效 易用 简约 漂亮 稳定 安全
                            </Heading>
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
                        <svg className="mt-12 ml-2" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800" opacity="1">
                            <defs>
                                <filter id="bbblurry-filter" x="-100%" y="-100%" width="400%" height="400%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                    <feGaussianBlur stdDeviation="77" x="0%" y="0%" width="100%" height="100%" in="SourceGraphic" edgeMode="none" result="blur"></feGaussianBlur>
                                </filter>
                            </defs>
                            <g filter="url(#bbblurry-filter)">
                                <ellipse rx="78.5" ry="80" cx="511.3427734375" cy="474.40447998046875" fill="#4c9fd7"></ellipse>
                                <ellipse rx="78.5" ry="80" cx="512.676306439944" cy="299.23062005966744" fill="#4c9fd7"></ellipse>
                                <ellipse rx="78.5" ry="80" cx="452.3887306732656" cy="396.6923141080048" fill="#0094ff"></ellipse>
                                <ellipse rx="78.5" ry="80" cx="339.2578494086939" cy="302.0300610926763" fill="#42f38c"></ellipse>
                                <ellipse rx="78.5" ry="80" cx="335.5279350879929" cy="473.333784812408" fill="#4c9fd7"></ellipse>
                            </g>
                        </svg>
                    </div>
                    <div className={styles.logo} style={{ userSelect: 'none' }}>
                        <img src="/img/logo/arcadia-pure-logo.png" className={clsx(styles.hideSmall)} draggable={false} />
                    </div>
                </div>
            </div>
        </header>
  )
}

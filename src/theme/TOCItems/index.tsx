/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react'
import { ConfigProvider, Carousel } from 'antd'
import TOCItems from '@theme-original/TOCItems'
import Heading from '@theme/Heading'
import Link from '@docusaurus/Link'
import { useLocation } from '@docusaurus/router'
import { useColorMode, useWindowSize } from '@docusaurus/theme-common'
import styles from './style.module.css'

function SidebarAd (): any {
  const { colorMode } = useColorMode()
  const contentStyle: React.CSSProperties = {
    height: '100%',
    width: '100%',
    lineHeight: '80px',
    textAlign: 'center',
    marginBottom: '0',
  }
  const background = colorMode === 'dark' ? '#161618' : '#f6f8fa'

  return (
    <ConfigProvider button={{ autoInsertSpace: false }}>
      <Carousel autoplay className={styles.ad} dotPosition="right">
        <Link to="/docs/about#%E8%B5%9E%E5%8A%A9" style={{ width: '200px', height: '75px', margin: '0' }}>
          <Heading as="h3" style={{ ...contentStyle, background }}>Arcadia</Heading>
        </Link>
        <Link to="/docs/about#%E8%B5%9E%E5%8A%A9" style={{ width: '200px', height: '75px', margin: '0' }}>
          <Heading as="h3" style={{ ...contentStyle, background }}>赞助商广告</Heading>
        </Link>
      </Carousel>
    </ConfigProvider>
  )
}

export default function TOCWrapper (props: any): any {
  const { pathname } = useLocation()
  const shouldShowSidebarAd = pathname.includes('/docs') && useWindowSize() !== 'mobile'
  if (shouldShowSidebarAd) {
    return (
      <>
          <TOCItems {...props} />
          {shouldShowSidebarAd && <SidebarAd />}
      </>
    )
  } else {
    return (
      <>
          <TOCItems {...props} />
      </>
    )
  }
}

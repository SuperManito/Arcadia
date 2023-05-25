/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react'
import { Carousel } from 'antd'
import { useLocation } from '@docusaurus/router'
import { useColorMode } from '@docusaurus/theme-common'
import Content from '@theme-original/DocSidebar/Desktop/Content'
import styles from './index.module.css'

function SidebarAd () {
  const { colorMode } = useColorMode()
  const contentStyle = {
    height: '100%',
    width: '100%',
    lineHeight: '100px',
    textAlign: 'center',
    marginBottom: '0',
  }
  const corlor = colorMode === 'dark' ? '#fff' : '#000'
  const background = colorMode === 'dark' ? '#1b1b1d' : '#B3B3B3'
  return (
    <Carousel autoplay waitForAnimate className={styles.ad} dotPosition="right">
      <a href="/docs/about#%E8%B5%9E%E5%8A%A9" style={{ corlor }}>
        <h3 style={{ ...contentStyle, corlor, background }}>成为赞助商</h3>
      </a>
      <a to="/docs/about#%E8%B5%9E%E5%8A%A9">
        <h3 style={{ ...contentStyle, corlor, background }}>成为赞助商</h3>
      </a>
    </Carousel>
  )
}

export default function ContentWrapper (props) {
  const { pathname } = useLocation()
  const shouldShowSidebarAd = pathname.includes('/docs')
  return (
    <>
        {shouldShowSidebarAd && <SidebarAd />}
        <Content {...props} />
    </>
  )
}

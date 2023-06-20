/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react'
import { ConfigProvider, Carousel } from 'antd'
import TOCItems from '@theme-original/TOCItems'
import { useLocation } from '@docusaurus/router'
import { useColorMode } from '@docusaurus/theme-common'
import styles from './style.module.css'

function SidebarAd () {
  const { colorMode } = useColorMode()
  const contentStyle = {
    height: '100%',
    width: '100%',
    lineHeight: '80px',
    textAlign: 'center',
    marginBottom: '0',
  }
  const corlor = colorMode === 'dark' ? '#fff' : '#000'
  const background = colorMode === 'dark' ? '#161618' : '#f6f8fa'

  return (
    <ConfigProvider autoInsertSpaceInButton={false}>
      <Carousel className={styles.ad} dotPosition="right">
        <a to="/docs/about#%E8%B5%9E%E5%8A%A9" style={{ width: '200px', height: '75px', margin: '0' }}>
          <h3 style={{ ...contentStyle, corlor, background }}>广告位招商</h3>
        </a>
        <a to="/docs/about#%E8%B5%9E%E5%8A%A9" style={{ width: '200px', height: '75px', margin: '0' }}>
          <h3 style={{ ...contentStyle, corlor, background }}>广告位招商</h3>
        </a>
      </Carousel>
    </ConfigProvider>
  )
}

export default function TOCWrapper (props) {
  const { pathname } = useLocation()
  const shouldShowSidebarAd = pathname.includes('/docs')
  return (
    <>
        <TOCItems {...props} />
        {shouldShowSidebarAd && <SidebarAd />}
    </>
  )
}

import React from 'react'
import Layout from '@theme/Layout'
import { useSiteConfig } from './hooks/useSiteConfig'
import PageContent from './components/PageContent'

export default function HomePage () {
  const siteConfig = useSiteConfig()
  return (
    <Layout
      title={`${siteConfig.title} · ${siteConfig.tagline}`}
      description={siteConfig.description as string}
    >
      <PageContent />
    </Layout>
  )
}

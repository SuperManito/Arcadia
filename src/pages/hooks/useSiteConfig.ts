import useDocusaurusContext from '@docusaurus/useDocusaurusContext'

export interface SiteConfig {
  title: string
  tagline: string
  url: string
  baseUrl: string
  projectName: string
  organizationName: string
  [key: string]: unknown
}

export function useSiteConfig (): SiteConfig {
  const { siteConfig } = useDocusaurusContext() as any
  return siteConfig as SiteConfig
}

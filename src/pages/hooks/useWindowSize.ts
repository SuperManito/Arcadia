import { useWindowSize as useDocusaurusWindowSize } from '@docusaurus/theme-common'

export function useWindowSize () {
  const windowSize = useDocusaurusWindowSize()
  return {
    isMobile: windowSize === 'mobile',
    isDesktop: windowSize === 'desktop',
    isSSR: windowSize === 'ssr',
  }
}

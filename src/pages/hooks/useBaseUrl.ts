import { useMemo } from 'react'
import useDocusaurusBaseUrl, { useBaseUrlUtils } from '@docusaurus/useBaseUrl'

export function useBaseUrl (path: string): string {
  return useDocusaurusBaseUrl(path)
}
export function useBaseUrls (paths: string[]): string[] {
  const { withBaseUrl } = useBaseUrlUtils()
  return useMemo(() => paths.map(p => withBaseUrl(p)), [paths, withBaseUrl])
}

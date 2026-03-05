import { useColorMode } from '@docusaurus/theme-common'

export function useTheme () {
  const { colorMode, setColorMode } = useColorMode()
  return {
    isDark: colorMode === 'dark',
    theme: colorMode,
    setTheme: setColorMode,
  }
}

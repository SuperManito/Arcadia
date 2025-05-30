import React, { type ReactNode } from 'react'
import clsx from 'clsx'
import useIsBrowser from '@docusaurus/useIsBrowser'
import { translate } from '@docusaurus/Translate'
import IconLightMode from '@theme/Icon/LightMode'
import IconDarkMode from '@theme/Icon/DarkMode'
import IconSystemColorMode from '@theme/Icon/SystemColorMode'
import type { Props } from '@theme/ColorModeToggle'
import type { ColorMode } from '@docusaurus/theme-common'

import styles from './styles.module.css'

// The order of color modes is defined here, and can be customized with swizzle
function getNextColorMode (
  colorMode: ColorMode | null,
  respectPrefersColorScheme: boolean,
) {
  // 2-value transition
  if (!respectPrefersColorScheme) {
    return colorMode === 'dark' ? 'light' : 'dark'
  }

  // 3-value transition
  switch (colorMode) {
    case null:
      return 'light'
    case 'light':
      return 'dark'
    case 'dark':
      return null
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`unexpected color mode ${colorMode}`)
  }
}

function getColorModeLabel (colorMode: ColorMode | null): string {
  switch (colorMode) {
    case null:
      return translate({
        message: 'system mode',
        id: 'theme.colorToggle.ariaLabel.mode.system',
        description: 'The name for the system color mode',
      })
    case 'light':
      return translate({
        message: 'light mode',
        id: 'theme.colorToggle.ariaLabel.mode.light',
        description: 'The name for the light color mode',
      })
    case 'dark':
      return translate({
        message: 'dark mode',
        id: 'theme.colorToggle.ariaLabel.mode.dark',
        description: 'The name for the dark color mode',
      })
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`unexpected color mode ${colorMode}`)
  }
}

function getColorModeAriaLabel (colorMode: ColorMode | null) {
  return translate(
    {
      message: 'Switch between dark and light mode (currently {mode})',
      id: 'theme.colorToggle.ariaLabel',
      description: 'The ARIA label for the color mode toggle',
    },
    {
      mode: getColorModeLabel(colorMode),
    },
  )
}

function CurrentColorModeIcon (): ReactNode {
  // 3 icons are always rendered for technical reasons
  // We use "data-theme-choice" to render the correct one
  // This must work even before React hydrates
  return (
    <>
      <IconLightMode
        // a18y is handled at the button level,
        // not relying on button content (svg icons)
        aria-hidden
        className={clsx(styles.toggleIcon, styles.lightToggleIcon)}
      />
      <IconDarkMode
        aria-hidden
        className={clsx(styles.toggleIcon, styles.darkToggleIcon)}
      />
      <IconSystemColorMode
        aria-hidden
        className={clsx(styles.toggleIcon, styles.systemToggleIcon)}
      />
    </>
  )
}

function ColorModeToggle ({
  className,
  buttonClassName,
  respectPrefersColorScheme,
  value,
  onChange,
}: Props): ReactNode {
  const isBrowser = useIsBrowser()
  // 转换动画
  const changeTheme = () => {
    const nextColorMode = getNextColorMode(value, respectPrefersColorScheme)
    const isSwitchToSystemTheme = !nextColorMode
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const currentColorMode = !value ? systemTheme : value === 'dark' ? 'dark' : 'light'
    if ((document as any).startViewTransition) {
      if (isSwitchToSystemTheme && systemTheme === currentColorMode) {
        onChange(nextColorMode)
        return
      } else if (nextColorMode === currentColorMode) {
        onChange(nextColorMode)
        return
      }
      (document as any).startViewTransition(() => { onChange(nextColorMode) })
    } else {
      onChange(nextColorMode)
    }
  }
  return (
    <div className={clsx(styles.toggle, className)}>
      <button
        className={clsx(
          'clean-btn',
          styles.toggleButton,
          !isBrowser && styles.toggleButtonDisabled,
          buttonClassName,
        )}
        type="button"
        onClick={() => { changeTheme() }
        }
        disabled={!isBrowser}
        title={getColorModeLabel(value)}
        aria-label={getColorModeAriaLabel(value)}

        // For accessibility decisions
        // See https://github.com/facebook/docusaurus/issues/7667#issuecomment-2724401796

        // aria-live disabled on purpose - This is annoying because:
        // - without this attribute, VoiceOver doesn't announce on button enter
        // - with this attribute, VoiceOver announces twice on ctrl+opt+space
        // - with this attribute, NVDA announces many times
        // aria-live="polite"
      >
        <CurrentColorModeIcon />
      </button>
    </div>
  )
}

export default React.memo(ColorModeToggle)

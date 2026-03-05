import React from 'react'
import { Icon as IconifyIcon } from '@iconify/react'

interface IconProps {
  icon?: string
  size?: string | number
  width?: string | number
  height?: string | number
  color?: string
  style?: React.CSSProperties
  children?: string
}

export function Icon ({ icon, size, width, height, color, style, children }: IconProps) {
  const iconName = icon || children
  if (!iconName) return null

  const fontSize = size ? (typeof size === 'number' ? `${size}px` : size) : '1.125em'
  const verticalAlign = style?.verticalAlign ?? '-0.15em'

  return (
    <span style={{ fontSize }}>
      <IconifyIcon
        icon={iconName}
        width={width}
        height={height}
        color={color}
        style={{
          verticalAlign,
          display: 'inline-flex',
          alignItems: 'center',
          ...(style ?? {}),
        }}
      />
    </span>
  )
}

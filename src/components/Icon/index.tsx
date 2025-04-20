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
  if (!iconName) {
    return null
  }

  const fontSize = size ? (typeof size === 'number' ? `${size}px` : size) : undefined
  const verticalAlign = fontSize === '18px' ? '-0.15rem' : fontSize === '20px' ? '-0.2rem' : fontSize === '22px' ? '-0.3rem' : fontSize === '24px' ? '-0.3rem' : '-0.15rem'

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
      ></IconifyIcon>
    </span>
  )
}

export function CHECK () {
  return (
    <span>
      <IconifyIcon icon="mdi:check" height="24" style={{ verticalAlign: '-0.35em', color: 'var(--ifm-color-success)', display: 'inline-flex', alignItems: 'center' }}></IconifyIcon>
    </span>
  )
}

export function CLOSE () {
  return (
    <span>
      <IconifyIcon icon="mdi:close" height="24" style={{ verticalAlign: '-0.35em', color: 'var(--ifm-color-danger)', display: 'inline-flex', alignItems: 'center' }}></IconifyIcon>
    </span>
  )
}

export function DockerIcon () {
  return (
    <span>
      <IconifyIcon icon="logos:docker-icon" height="16" style={{ verticalAlign: '-0.25em', display: 'inline-flex', alignItems: 'center' }}></IconifyIcon>
    </span>
  )
}

export function PodmanIcon () {
  return (
    <span>
      <IconifyIcon icon="devicon:podman" height="18" style={{ verticalAlign: '-0.35em', display: 'inline-flex', alignItems: 'center' }}></IconifyIcon>
    </span>
  )
}

export function FeaturesIcon () {
  return (
    <span>
      <IconifyIcon icon="fluent-emoji:rocket" height="26" style={{ verticalAlign: '-0.2em', display: 'inline-flex', alignItems: 'center' }}></IconifyIcon>
    </span>
  )
}

export function BugIcon () {
  return (
    <span>
      <IconifyIcon icon="fluent-emoji:bug" height="26" style={{ verticalAlign: '-0.2em', display: 'inline-flex', alignItems: 'center' }}></IconifyIcon>
    </span>
  )
}

export function OptimizeIcon () {
  return (
    <span>
      <IconifyIcon icon="fluent-emoji:hammer-and-wrench" height="26" style={{ verticalAlign: '-0.2em', display: 'inline-flex', alignItems: 'center' }}></IconifyIcon>
    </span>
  )
}

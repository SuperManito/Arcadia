import React from 'react'
import { Icon as IconifyIcon } from '@iconify/react'

interface IconProps {
  icon?: string
  size?: string | number
  color?: string
  style?: React.CSSProperties
  children?: string
}

export function Icon ({ icon, size, color, style, children }: IconProps) {
  const iconName = icon || children
  if (!iconName) {
    return null
  }
  if (!size) size = '24'
  const verticalAlign = size === '18' ? '-0.15em' : size === '20' ? '-0.2em' : size === '22' ? '-0.3em' : size === '24' ? '-0.4em' : 'baseline'
  return (
    <span>
      <IconifyIcon
        icon={iconName}
        width={size}
        height={size}
        color={color}
        style={{
          verticalAlign,
          ...(style ?? {}),
        }}
      ></IconifyIcon>
    </span>
  )
}

export function CHECK () {
  return (
    <span>
      <IconifyIcon icon="mdi:check" height="24" style={{ verticalAlign: '-0.35em', color: 'var(--ifm-color-success)' }}></IconifyIcon>
    </span>
  )
}

export function CLOSE () {
  return (
    <span>
      <IconifyIcon icon="mdi:close" height="24" style={{ verticalAlign: '-0.35em', color: 'var(--ifm-color-danger)' }}></IconifyIcon>
    </span>
  )
}

export function DockerIcon () {
  return (
    <span>
      <IconifyIcon icon="logos:docker-icon" height="16" style={{ verticalAlign: '-0.25em' }}></IconifyIcon>
    </span>
  )
}

export function PodmanIcon () {
  return (
    <span>
      <IconifyIcon icon="devicon:podman" height="18" style={{ verticalAlign: '-0.35em' }}></IconifyIcon>
    </span>
  )
}

export function FeaturesIcon () {
  return (
    <span>
      <IconifyIcon icon="fluent-emoji:rocket" height="26" style={{ verticalAlign: '-0.2em' }}></IconifyIcon>
    </span>
  )
}

export function BugIcon () {
  return (
    <span>
      <IconifyIcon icon="fluent-emoji:bug" height="26" style={{ verticalAlign: '-0.2em' }}></IconifyIcon>
    </span>
  )
}

export function OptimizeIcon () {
  return (
    <span>
      <IconifyIcon icon="fluent-emoji:hammer-and-wrench" height="26" style={{ verticalAlign: '-0.2em' }}></IconifyIcon>
    </span>
  )
}

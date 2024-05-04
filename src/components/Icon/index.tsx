import React from 'react'
import { Icon } from '@iconify/react'

export function ICON ({ children, size, color, style }: { children: string, size?: string, color?: string, style?: React.CSSProperties }) {
  if (!size) size = '24'
  const verticalAlign = size === '18' ? '-0.15em' : size === '20' ? '-0.2em' : size === '22' ? '-0.3em' : size === '24' ? '-0.4em' : 'baseline'
  return (
    <span>
      <Icon
        icon={children}
        width={size}
        height={size}
        color={color}
        style={{
          verticalAlign,
          ...(style ?? {}),
        }}
      ></Icon>
    </span>
  )
}

export function CHECK () {
  return (
    <span>
      <Icon icon="mdi:check" height="24" style={{ verticalAlign: '-0.35em', color: 'var(--ifm-color-success)' }}></Icon>
    </span>
  )
}

export function CLOSE () {
  return (
    <span>
      <Icon icon="mdi:close" height="24" style={{ verticalAlign: '-0.35em', color: 'var(--ifm-color-danger)' }}></Icon>
    </span>
  )
}

export function DockerIcon () {
  return (
    <span>
      <Icon icon="logos:docker-icon" height="16" style={{ verticalAlign: '-0.25em' }}></Icon>
    </span>
  )
}

export function PodmanIcon () {
  return (
    <span>
      <Icon icon="devicon:podman" height="18" style={{ verticalAlign: '-0.35em' }}></Icon>
    </span>
  )
}

export function FeaturesIcon () {
  return (
    <span>
      <Icon icon="fluent-emoji:rocket" height="26" style={{ verticalAlign: '-0.2em' }}></Icon>
    </span>
  )
}

export function BugIcon () {
  return (
    <span>
      <Icon icon="fluent-emoji:bug" height="26" style={{ verticalAlign: '-0.2em' }}></Icon>
    </span>
  )
}

export function OptimizeIcon () {
  return (
    <span>
      <Icon icon="fluent-emoji:hammer-and-wrench" height="26" style={{ verticalAlign: '-0.2em' }}></Icon>
    </span>
  )
}

import React from 'react'
import { Icon } from '@iconify/react'

export function ICON ({ children }: { children: string }) {
  return (
    <span>
      <Icon icon={children} height="24" style={{ verticalAlign: '-0.35em' }}></Icon>
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
      <Icon icon="logos:docker-icon" height="16" style={{ verticalAlign: '-0.25em', color: 'var(--ifm-color-danger)' }}></Icon>
    </span>
  )
}

export function PodmanIcon () {
  return (
    <span>
      <Icon icon="devicon:podman" height="18" style={{ verticalAlign: '-0.35em', color: 'var(--ifm-color-danger)' }}></Icon>
    </span>
  )
}

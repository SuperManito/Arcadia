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

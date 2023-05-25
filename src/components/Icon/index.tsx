import React from 'react'
import { Icon } from '@iconify/react'

export function ICON ({ children }: { children: string }) {
  return (
    <span>
        <Icon icon={children} height="24" style={{ verticalAlign: '-0.35em' }}></Icon>
    </span>
  )
}

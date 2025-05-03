import React, { useState, useRef } from 'react'
import { Icon } from '../Icon'
import audio from '@site/static/audio/arcadia.mp3'

export default function Pronounce () {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const play = () => {
    (audioRef.current as any).play()
  }

  const [isHover, setIsHover] = useState(false)

  const handleMouseEnter = () => {
    setIsHover(true)
  }
  const handleMouseLeave = () => {
    setIsHover(false)
  }

  return (
    <span
      style={{
        borderRadius: '2px',
        color: isHover ? 'var(--ifm-color-primary)' : 'var(--ifm-table-border-color)',
        padding: '0.2rem',
        cursor: 'pointer',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={play}
    >
      <Icon style={{ verticalAlign: '-0.15em' }}>
        line-md:volume-high
      </Icon>
      <audio src={audio} ref={audioRef} style={{ display: 'none' }}></audio>
    </span>
  )
}

import React, { useState, useRef } from 'react'
import { Icon } from '../Icon'

export default function Pronounce () {
  const audioRef: any = useRef()
  const play = () => {
    audioRef.current.play()
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const audio = require('@site/static/audio/arcadia.mp3').default

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
      <Icon>
        streamline:entertainment-volume-level-high-speaker-high-volume-control-audio-music
      </Icon>
      <audio src={audio} ref={audioRef} style={{ display: 'none' }}></audio>
    </span>
  )
}

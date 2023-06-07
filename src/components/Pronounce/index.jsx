import React, { useState, useRef } from 'react'
import { ICON } from '@site/src/components/Icon'

export default function Pronounce () {
  const audioRef = useRef()
  const play = () => {
    audioRef.current.play()
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
      <ICON>
        streamline:entertainment-volume-level-high-speaker-high-volume-control-audio-music
      </ICON>
      <audio src={require('@site/static/audio/arcadia.mp3').default} ref={audioRef} style={{ display: 'none' }}></audio>
    </span>
  )
}

import React, { memo } from 'react'

interface AuroraTextProps {
  children: React.ReactNode
  className?: string
  colors?: string[]
  speed?: number
}

const AuroraText = memo(({ children, className = '', colors = ['#0084dc', '#0090ae', '#9dfebd', '#bbfe61', '#0090ae', '#0084dc'], speed = 1 }: AuroraTextProps) => {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(', ')}, ${colors[0]})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundSize: '200% auto',
    animation: `aurora-text-flow ${10 / speed}s linear infinite`,
  }
  return (
    <>
      <style>{`
        @keyframes aurora-text-flow {
          0% { background-position: 200% center; }
          100% { background-position: 0% center; }
        }
      `}</style>
      <span className={`relative inline bg-clip-text text-transparent ${className}`} style={gradientStyle}>
        {children}
      </span>
    </>
  )
})

AuroraText.displayName = 'AuroraText'

export default AuroraText

import React from 'react'
import Heading from '@theme/Heading'

const Method = ({ method, color, children }: { method: string, color: string, children: string }) => {
  return (
    <Heading as="h4"
      style={{
        backgroundColor: `${color}1a`,
        borderRadius: '6px',
        border: `2px solid ${color}`,
        padding: '8px 4px 9px 4px',
        width: 'fit-content',
        marginTop: '0',
        marginBottom: '10px',
      }}
    >
      <span
        style={{
          backgroundColor: `${color}`,
          borderRadius: '5px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '700',
          userSelect: 'none',
          padding: '6px 10px',
          textAlign: 'center',
        }}
      >
        {method}
      </span>
      <span
        style={{
          fontSize: '16px',
          fontWeight: '600',
          fontFamily: 'SF Mono',
          padding: '0 4px 0 10px',
          alignItems: 'center',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </span>
    </Heading>
  )
}

export const GET = ({ children }: { children: string }) => <Method method="GET" color="#61affe">{children}</Method>
export const POST = ({ children }: { children: string }) => <Method method="POST" color="#49cc90">{children}</Method>
export const DELETE = ({ children }: { children: string }) => <Method method="DELETE" color="#f93e3e">{children}</Method>
export const PUT = ({ children }: { children: string }) => <Method method="PUT" color="#fca130">{children}</Method>

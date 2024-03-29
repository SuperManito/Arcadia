import React from 'react'

export function POST ({ children }: { children: string }) {
  return (
    <span
      style={{
        backgroundColor: 'rgba(73,204,144,.1)',
        borderRadius: '4px',
        border: '1px solid #49cc90',
        padding: '10px 6px 12px 6px',
      }}
    >
      <span
        style={{
          backgroundColor: '#49cc90',
          borderRadius: '3px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '700',
          userSelect: 'none',
          padding: '6px 10px',
          textAlign: 'center',
        }}
      >
        POST
      </span>
      <span
        style={{
          fontSize: '16px',
          fontWeight: '600',
          fontFamily: 'monospace',
          padding: '0 4px 0 10px',
          alignItems: 'center',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </span>
    </span>
  )
}

export function GET ({ children }: { children: string }) {
  return (
    <span
      style={{
        backgroundColor: 'rgba(97,175,254,.1)',
        borderRadius: '4px',
        border: '1px solid #61affe',
        padding: '10px 6px 12px 6px',
      }}
    >
      <span
        style={{
          backgroundColor: '#61affe',
          borderRadius: '3px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '700',
          userSelect: 'none',
          padding: '6px 10px',
          textAlign: 'center',
        }}
      >
        GET
      </span>
      <span
        style={{
          fontSize: '16px',
          fontWeight: '600',
          fontFamily: 'monospace',
          padding: '0 4px 0 10px',
          alignItems: 'center',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </span>
    </span>
  )
}

export function DELETE ({ children }: { children: string }) {
  return (
    <span
      style={{
        backgroundColor: 'rgba(249,62,62,.1)',
        borderRadius: '4px',
        border: '1px solid #f93e3e',
        padding: '10px 6px 12px 6px',
      }}
    >
      <span
        style={{
          backgroundColor: '#f93e3e',
          borderRadius: '3px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '700',
          userSelect: 'none',
          padding: '6px 10px',
          textAlign: 'center',
        }}
      >
        DELETE
      </span>
      <span
        style={{
          fontSize: '16px',
          fontWeight: '600',
          fontFamily: 'monospace',
          padding: '0 4px 0 10px',
          alignItems: 'center',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </span>
    </span>
  )
}

export function PUT ({ children }: { children: string }) {
  return (
    <span
      style={{
        backgroundColor: 'rgba(252,161,48,.1)',
        borderRadius: '4px',
        border: '1px solid #fca130',
        padding: '10px 6px 12px 6px',
      }}
    >
      <span
        style={{
          backgroundColor: '#fca130',
          borderRadius: '3px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '700',
          userSelect: 'none',
          padding: '6px 10px',
          textAlign: 'center',
        }}
      >
        PUT
      </span>
      <span
        style={{
          fontSize: '16px',
          fontWeight: '600',
          fontFamily: 'monospace',
          padding: '0 4px 0 10px',
          alignItems: 'center',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </span>
    </span>
  )
}

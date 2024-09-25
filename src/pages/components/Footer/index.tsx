import React from 'react'

export default function Footer () {
  return (
        <footer className="footer">
            <div className="container container--fluid">
                <div className="text--center">Copyright © {new Date().getFullYear()} SuperManito</div>
            </div>
        </footer>
  )
}

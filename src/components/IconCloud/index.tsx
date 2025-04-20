import React, { useEffect, useRef, useState } from 'react'

interface Icon {
  x: number
  y: number
  z: number
  scale: number
  opacity: number
  id: number
}

interface IconCloudProps {
  images?: string[]
  color?: string
  rotationSpeed?: number
}

function easeOutCubic (t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function IconCloudComponent ({ images, color, rotationSpeed = 0.003 }: IconCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [iconPositions, setIconPositions] = useState<Icon[]>([])
  const [rotation] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [targetRotation, setTargetRotation] = useState<{
    x: number
    y: number
    startX: number
    startY: number
    distance: number
    startTime: number
    duration: number
  } | null>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const rotationRef = useRef(rotation)
  const iconCanvasesRef = useRef<HTMLCanvasElement[]>([])
  const imagesLoadedRef = useRef<boolean[]>([])

  // Create icon canvases once when images change
  useEffect(() => {
    if (!images || images.length === 0) return

    const items = images || []
    imagesLoadedRef.current = new Array(images.length).fill(false)
    const newIconCanvases = items.map((svgString, index) => {
      const offscreen = document.createElement('canvas')
      offscreen.width = 40
      offscreen.height = 40
      const offCtx = offscreen.getContext('2d')

      if (offCtx) {
        if (images) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          let finalSvg = svgString
          if (color) {
            finalSvg = finalSvg.replace(/fill="([^"]*)"/g, `fill="${color}"`)
            finalSvg = finalSvg.replace(/stroke="([^"]*)"/g, `stroke="${color}"`)
          }
          const svg64 = btoa(unescape(encodeURIComponent(finalSvg)))
          img.src = `data:image/svg+xml;base64,${svg64}`

          img.onload = () => {
            offCtx.clearRect(0, 0, offscreen.width, offscreen.height)

            offCtx.beginPath()
            offCtx.arc(20, 20, 20, 0, Math.PI * 2)
            offCtx.closePath()
            offCtx.clip()
            offCtx.drawImage(img, 0, 0, 40, 40)
            imagesLoadedRef.current[index] = true
          }
          img.onerror = () => {
            console.error(`Failed to load SVG at index ${index}`)
            imagesLoadedRef.current[index] = true
          }
        }
      }
      return offscreen
    })
    iconCanvasesRef.current = newIconCanvases
  }, [images, color])

  // Generate initial icon positions on a sphere
  useEffect(() => {
    if (!images) return

    const newIcons: Icon[] = []
    const numIcons = images.length || 20

    // Fibonacci sphere parameters
    const offset = 2 / numIcons
    const increment = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < numIcons; i++) {
      const y = i * offset - 1 + offset / 2
      const r = Math.sqrt(1 - y * y)
      const phi = i * increment

      const x = Math.cos(phi) * r
      const z = Math.sin(phi) * r

      newIcons.push({
        x: x * 100,
        y: y * 100,
        z: z * 100,
        scale: 1,
        opacity: 1,
        id: i,
      })
    }
    setIconPositions(newIcons)
  }, [images])

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || !canvasRef.current) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    iconPositions.forEach((icon) => {
      const cosX = Math.cos(rotationRef.current.x)
      const sinX = Math.sin(rotationRef.current.x)
      const cosY = Math.cos(rotationRef.current.y)
      const sinY = Math.sin(rotationRef.current.y)

      const rotatedX = icon.x * cosY - icon.z * sinY
      const rotatedZ = icon.x * sinY + icon.z * cosY
      const rotatedY = icon.y * cosX + rotatedZ * sinX

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const screenX = canvasRef.current!.width / 2 + rotatedX
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const screenY = canvasRef.current!.height / 2 + rotatedY

      const scale = (rotatedZ + 200) / 300
      const radius = 20 * scale
      const dx = x - screenX
      const dy = y - screenY

      if (dx * dx + dy * dy < radius * radius) {
        const targetX = -Math.atan2(
          icon.y,
          Math.sqrt(icon.x * icon.x + icon.z * icon.z),
        )
        const targetY = Math.atan2(icon.x, icon.z)

        const currentX = rotationRef.current.x
        const currentY = rotationRef.current.y
        const distance = Math.sqrt(
          Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2),
        )

        const duration = Math.min(2000, Math.max(800, distance * 1000))

        setTargetRotation({
          x: targetX,
          y: targetY,
          startX: currentX,
          startY: currentY,
          distance,
          startTime: performance.now(),
          duration,
        })
      }
    })

    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setMousePos({ x, y })
    }

    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y

      rotationRef.current = {
        x: rotationRef.current.x + deltaY * 0.002,
        y: rotationRef.current.y + deltaX * 0.002,
      }

      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Animation and rendering
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)
      const dx = mousePos.x - centerX
      const dy = mousePos.y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      const speed = rotationSpeed + (distance / maxDistance) * 0.002

      if (targetRotation) {
        const elapsed = performance.now() - targetRotation.startTime
        const progress = Math.min(1, elapsed / targetRotation.duration)
        const easedProgress = easeOutCubic(progress)

        rotationRef.current = {
          x:
            targetRotation.startX +
            (targetRotation.x - targetRotation.startX) * easedProgress,
          y:
            targetRotation.startY +
            (targetRotation.y - targetRotation.startY) * easedProgress,
        }

        if (progress >= 1) {
          setTargetRotation(null)
        }
      } else if (!isDragging) {
        rotationRef.current = {
          x: rotationRef.current.x + (dy / canvas.height) * speed,
          y: rotationRef.current.y + (dx / canvas.width) * speed,
        }
      }

      iconPositions.forEach((icon, index) => {
        const cosX = Math.cos(rotationRef.current.x)
        const sinX = Math.sin(rotationRef.current.x)
        const cosY = Math.cos(rotationRef.current.y)
        const sinY = Math.sin(rotationRef.current.y)

        const rotatedX = icon.x * cosY - icon.z * sinY
        const rotatedZ = icon.x * sinY + icon.z * cosY
        const rotatedY = icon.y * cosX + rotatedZ * sinX

        const scale = (rotatedZ + 200) / 300
        const opacity = Math.max(0.2, Math.min(1, (rotatedZ + 150) / 200))

        ctx.save()
        ctx.translate(
          canvas.width / 2 + rotatedX,
          canvas.height / 2 + rotatedY,
        )
        ctx.scale(scale, scale)
        ctx.globalAlpha = opacity

        if (images && images.length > 0) {
          if (
            iconCanvasesRef.current[index] &&
            imagesLoadedRef.current[index]
          ) {
            ctx.drawImage(iconCanvasesRef.current[index], -20, -20, 40, 40)
          }
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, 20, 0, Math.PI * 2)
          ctx.fillStyle = '#4444ff'
          ctx.fill()
          ctx.fillStyle = 'white'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.font = '16px Arial'
          ctx.fillText(`${icon.id + 1}`, 0, 0)
        }

        ctx.restore()
      })
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [images, iconPositions, isDragging, mousePos, targetRotation, rotationSpeed])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="rounded-lg"
      aria-label="Interactive 3D Icon Cloud"
      role="img"
    />
  )
}

export default function IconCloud () {
  const iconNames = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#f5de19" d="M2 2h28v28H2z"/><path d="M20.809 23.875a2.87 2.87 0 0 0 2.6 1.6c1.09 0 1.787-.545 1.787-1.3c0-.9-.716-1.222-1.916-1.747l-.658-.282c-1.9-.809-3.16-1.822-3.16-3.964c0-1.973 1.5-3.476 3.853-3.476a3.89 3.89 0 0 1 3.742 2.107L25 18.128A1.79 1.79 0 0 0 23.311 17a1.145 1.145 0 0 0-1.259 1.128c0 .789.489 1.109 1.618 1.6l.658.282c2.236.959 3.5 1.936 3.5 4.133c0 2.369-1.861 3.667-4.36 3.667a5.06 5.06 0 0 1-4.795-2.691Zm-9.295.228c.413.733.789 1.353 1.693 1.353c.864 0 1.41-.338 1.41-1.653v-8.947h2.631v8.982c0 2.724-1.6 3.964-3.929 3.964a4.085 4.085 0 0 1-3.947-2.4Z"/></svg>', // js
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="28" height="28" x="2" y="2" fill="#3178c6" rx="1.312"/><path fill="#fff" fill-rule="evenodd" d="M18.245 23.759v3.068a6.5 6.5 0 0 0 1.764.575a11.6 11.6 0 0 0 2.146.192a10 10 0 0 0 2.088-.211a5.1 5.1 0 0 0 1.735-.7a3.54 3.54 0 0 0 1.181-1.266a4.47 4.47 0 0 0 .186-3.394a3.4 3.4 0 0 0-.717-1.117a5.2 5.2 0 0 0-1.123-.877a12 12 0 0 0-1.477-.734q-.6-.249-1.08-.484a5.5 5.5 0 0 1-.813-.479a2.1 2.1 0 0 1-.516-.518a1.1 1.1 0 0 1-.181-.618a1.04 1.04 0 0 1 .162-.571a1.4 1.4 0 0 1 .459-.436a2.4 2.4 0 0 1 .726-.283a4.2 4.2 0 0 1 .956-.1a6 6 0 0 1 .808.058a6 6 0 0 1 .856.177a6 6 0 0 1 .836.3a4.7 4.7 0 0 1 .751.422V13.9a7.5 7.5 0 0 0-1.525-.4a12.4 12.4 0 0 0-1.9-.129a8.8 8.8 0 0 0-2.064.235a5.2 5.2 0 0 0-1.716.733a3.66 3.66 0 0 0-1.171 1.271a3.73 3.73 0 0 0-.431 1.845a3.6 3.6 0 0 0 .789 2.34a6 6 0 0 0 2.395 1.639q.63.26 1.175.509a6.5 6.5 0 0 1 .942.517a2.5 2.5 0 0 1 .626.585a1.2 1.2 0 0 1 .23.719a1.1 1.1 0 0 1-.144.552a1.3 1.3 0 0 1-.435.441a2.4 2.4 0 0 1-.726.292a4.4 4.4 0 0 1-1.018.105a5.8 5.8 0 0 1-1.969-.35a5.9 5.9 0 0 1-1.805-1.045m-5.154-7.638h4v-2.527H5.938v2.527H9.92v11.254h3.171Z"/></svg>', // ts
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="vscodeIconsFileTypePython0" x1="-133.268" x2="-133.198" y1="-202.91" y2="-202.84" gradientTransform="matrix(189.38 0 0 189.81 25243.061 38519.17)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#387eb8"/><stop offset="1" stop-color="#366994"/></linearGradient><linearGradient id="vscodeIconsFileTypePython1" x1="-133.575" x2="-133.495" y1="-203.203" y2="-203.133" gradientTransform="matrix(189.38 0 0 189.81 25309.061 38583.42)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe052"/><stop offset="1" stop-color="#ffc331"/></linearGradient></defs><path fill="url(#vscodeIconsFileTypePython0)" d="M15.885 2.1c-7.1 0-6.651 3.07-6.651 3.07v3.19h6.752v1H6.545S2 8.8 2 16.005s4.013 6.912 4.013 6.912H8.33v-3.361s-.13-4.013 3.9-4.013h6.762s3.772.06 3.772-3.652V5.8s.572-3.712-6.842-3.712Zm-3.732 2.137a1.214 1.214 0 1 1-1.183 1.244v-.02a1.214 1.214 0 0 1 1.214-1.214Z"/><path fill="url(#vscodeIconsFileTypePython1)" d="M16.085 29.91c7.1 0 6.651-3.08 6.651-3.08v-3.18h-6.751v-1h9.47S30 23.158 30 15.995s-4.013-6.912-4.013-6.912H23.64V12.4s.13 4.013-3.9 4.013h-6.765S9.2 16.356 9.2 20.068V26.2s-.572 3.712 6.842 3.712h.04Zm3.732-2.147A1.214 1.214 0 1 1 21 26.519v.03a1.214 1.214 0 0 1-1.214 1.214z"/></svg>', // python
    '<svg xmlns="http://www.w3.org/2000/svg" width="36.2" height="32" viewBox="0 0 254.5 225"><path fill="#00acd7" d="M-46.926 89c-.621 0-.777-.311-.466-.777l3.262-4.194a2.23 2.23 0 0 1 1.708-.777h55.448c.621 0 .777.466.466.932l-2.64 4.038a2.37 2.37 0 0 1-1.553.932Zm-23.453 14.285c-.621 0-.777-.311-.466-.777l3.262-4.194a2.23 2.23 0 0 1 1.708-.777H4.95a.714.714 0 0 1 .777.932L4.484 102.2a1.36 1.36 0 0 1-1.4.932Zm37.587 14.289c-.621 0-.777-.466-.466-.932l2.174-3.883a2.06 2.06 0 0 1 1.553-.932H1.533c.621 0 .932.466.932 1.087l-.311 3.728a1.17 1.17 0 0 1-1.087 1.087ZM128.426 86.2c-9.785 2.485-16.464 4.349-26.093 6.834c-2.33.621-2.485.777-4.5-1.553c-2.33-2.64-4.038-4.349-7.3-5.9c-9.785-4.815-19.259-3.417-28.112 2.33c-10.561 6.834-16 16.929-15.842 29.51c.155 12.425 8.7 22.676 20.968 24.385c10.561 1.4 19.414-2.33 26.4-10.251c1.4-1.708 2.64-3.572 4.194-5.747H68.163c-3.262 0-4.038-2.019-2.951-4.659c2.019-4.815 5.747-12.891 7.921-16.929a4.19 4.19 0 0 1 3.883-2.485h56.535c-.311 4.194-.311 8.387-.932 12.581a66.24 66.24 0 0 1-12.736 30.442c-11.183 14.752-25.783 23.915-44.265 26.4c-15.221 2.019-29.355-.932-41.78-10.251a48.8 48.8 0 0 1-19.725-34.48c-2.019-16.929 2.951-32.15 13.2-45.508C38.342 66.475 52.942 57.312 70.8 54.05c14.6-2.64 28.578-.932 41.159 7.61a48.7 48.7 0 0 1 18.017 21.9c.935 1.398.313 2.175-1.55 2.64"/><path fill="#00acd7" d="M179.835 172.09c-14.134-.311-27.025-4.349-37.9-13.668a48.7 48.7 0 0 1-16.774-29.976c-2.8-17.551 2.019-33.082 12.581-46.905c11.338-14.91 25.006-22.676 43.488-25.938c15.842-2.8 30.753-1.243 44.265 7.921c12.27 8.387 19.88 19.725 21.9 34.635c2.64 20.968-3.417 38.052-17.861 52.652a71.17 71.17 0 0 1-37.276 19.88c-4.191.778-8.384.933-12.423 1.399m36.965-62.747a45 45 0 0 0-.466-5.125c-2.8-15.376-16.929-24.074-31.684-20.657c-14.444 3.262-23.763 12.425-27.18 27.025a25.58 25.58 0 0 0 14.289 29.355c8.542 3.728 17.085 3.262 25.317-.932c12.269-6.369 18.948-16.309 19.724-29.666"/></svg>', // go
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><radialGradient id="vscodeIconsFileTypeRust0" cx="-492.035" cy="-883.37" r="13.998" gradientTransform="matrix(.866 -.5 -.3 -.52 177.106 -689.033)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7d7d7d"/><stop offset=".267" stop-color="#7e7c7a"/><stop offset=".45" stop-color="#817871"/><stop offset=".608" stop-color="#867162"/><stop offset=".753" stop-color="#8d684c"/><stop offset=".886" stop-color="#965c30"/><stop offset="1" stop-color="#a04f12"/></radialGradient></defs><path fill="url(#vscodeIconsFileTypeRust0)" d="M15.124 5.3a.832.832 0 1 1 .832.832a.83.83 0 0 1-.832-.832M5.2 12.834a.832.832 0 1 1 .832.832a.83.83 0 0 1-.832-.832m19.856.039a.832.832 0 1 1 .832.832a.83.83 0 0 1-.832-.832m-17.451 1.14a.76.76 0 0 0 .386-1l-.369-.835h1.452v6.545h-2.93a10.3 10.3 0 0 1-.332-3.911Zm6.074.161v-1.929h3.458c.179 0 1.261.206 1.261 1.016c0 .672-.83.913-1.513.913ZM8.958 24.561a.832.832 0 1 1 .832.832a.83.83 0 0 1-.832-.832m12.331.039a.832.832 0 1 1 .832.832a.83.83 0 0 1-.832-.832m.257-1.887a.76.76 0 0 0-.9.584l-.418 1.949a10.25 10.25 0 0 1-8.545-.041l-.417-1.949a.76.76 0 0 0-.9-.583l-1.721.37a10 10 0 0 1-.89-1.049h8.374c.095 0 .158-.017.158-.1v-2.966c0-.086-.063-.1-.158-.1h-2.45v-1.881h2.649a1.665 1.665 0 0 1 1.629 1.412c.105.413.336 1.757.494 2.187c.157.483.8 1.447 1.482 1.447h4.323a10 10 0 0 1-.949 1.1Zm4.65-7.821a10.3 10.3 0 0 1 .022 1.779h-1.051c-.105 0-.148.069-.148.172v.483c0 1.136-.641 1.384-1.2 1.447c-.535.06-1.128-.224-1.2-.551a3.62 3.62 0 0 0-1.671-2.808c1.03-.654 2.1-1.619 2.1-2.911A3.29 3.29 0 0 0 21.44 9.8a4.56 4.56 0 0 0-2.2-.724H8.367A10.25 10.25 0 0 1 14.1 5.84l1.282 1.344a.76.76 0 0 0 1.072.026l1.434-1.372a10.25 10.25 0 0 1 7.015 5l-.982 2.217a.76.76 0 0 0 .386 1Zm2.448.036l-.033-.343l1.011-.943a.42.42 0 0 0-.013-.595a.4.4 0 0 0-.121-.081l-1.288-.483l-.1-.334l.806-1.12a.42.42 0 0 0-.13-.581a.4.4 0 0 0-.133-.055l-1.363-.222l-.164-.306l.573-1.257a.42.42 0 0 0-.236-.544a.4.4 0 0 0-.146-.029l-1.383.048l-.224-.264l.318-1.347a.42.42 0 0 0-.343-.487a.4.4 0 0 0-.144 0l-1.348.315l-.266-.219l.049-1.381a.42.42 0 0 0-.431-.411a.4.4 0 0 0-.141.028l-1.257.573l-.306-.164l-.222-1.363a.42.42 0 0 0-.5-.318a.4.4 0 0 0-.133.055l-1.121.806l-.333-.1l-.483-1.293a.42.42 0 0 0-.555-.215a.4.4 0 0 0-.12.08l-.946 1.012l-.343-.033l-.728-1.177a.42.42 0 0 0-.688 0l-.728 1.177l-.343.033l-.943-1.012a.42.42 0 0 0-.595.015a.4.4 0 0 0-.08.12L12.483 3.8l-.333.1l-1.12-.8a.42.42 0 0 0-.581.13a.4.4 0 0 0-.055.133l-.222 1.363l-.306.164l-1.258-.573a.42.42 0 0 0-.544.239a.4.4 0 0 0-.028.144l.048 1.383l-.266.217l-1.347-.316a.42.42 0 0 0-.487.343a.4.4 0 0 0 0 .144L6.3 7.819l-.218.265L4.7 8.036a.422.422 0 0 0-.383.573l.573 1.257l-.164.306l-1.363.222a.42.42 0 0 0-.318.5a.4.4 0 0 0 .055.133l.806 1.12l-.1.334l-1.293.483a.42.42 0 0 0-.215.555a.4.4 0 0 0 .081.121l1.011.943l-.033.343l-1.177.728a.42.42 0 0 0 0 .688l1.177.728l.033.343l-1.011.943a.42.42 0 0 0 .015.595a.4.4 0 0 0 .119.08l1.293.483l.1.334l-.806 1.124a.42.42 0 0 0 .131.581a.4.4 0 0 0 .133.055l1.363.222l.164.307l-.573 1.257a.42.42 0 0 0 .24.545a.4.4 0 0 0 .143.028l1.383-.048l.219.266l-.317 1.348a.42.42 0 0 0 .341.486a.4.4 0 0 0 .146 0l1.345-.319l.266.218l-.049 1.382a.42.42 0 0 0 .429.41a.4.4 0 0 0 .143-.028l1.257-.573l.306.164l.222 1.362a.42.42 0 0 0 .5.319a.4.4 0 0 0 .133-.055l1.12-.807l.334.1l.483 1.292a.42.42 0 0 0 .556.214a.4.4 0 0 0 .119-.08l.943-1.011l.343.034l.728 1.177a.42.42 0 0 0 .588.1a.4.4 0 0 0 .1-.1l.728-1.177l.343-.034l.943 1.011a.42.42 0 0 0 .595-.015a.4.4 0 0 0 .08-.119l.483-1.292l.334-.1l1.12.807a.42.42 0 0 0 .581-.131a.4.4 0 0 0 .055-.133l.222-1.362l.306-.164l1.257.573a.42.42 0 0 0 .544-.239a.4.4 0 0 0 .028-.143l-.048-1.384l.265-.218l1.347.317a.42.42 0 0 0 .487-.34a.5.5 0 0 0 0-.146l-.309-1.346l.218-.266l1.383.048a.42.42 0 0 0 .41-.431a.4.4 0 0 0-.028-.142l-.573-1.257l.164-.307l1.363-.222a.42.42 0 0 0 .319-.5a.4.4 0 0 0-.056-.135l-.806-1.12l.1-.334l1.293-.483a.42.42 0 0 0 .215-.554a.4.4 0 0 0-.081-.121l-1.011-.943l.033-.343l1.177-.728a.42.42 0 0 0 0-.688Z"/></svg>', // rust
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="gray" d="m16.5 30l-.011-.321c.4-.014.8-.045 1.19-.094l.039.319c-.406.048-.818.08-1.218.096m-1.222-.011c-.4-.021-.814-.061-1.216-.118l.045-.318c.393.055.793.094 1.188.115Zm3.642-.289l-.067-.314c.387-.083.776-.184 1.155-.3l.094.307c-.388.118-.786.222-1.182.307m-6.063-.053q-.599-.137-1.177-.326l.1-.306c.377.122.764.23 1.15.319Zm8.4-.665l-.121-.3c.364-.148.728-.314 1.08-.493h.006l.145.286q-.553.28-1.114.507Zm-10.718-.088a14 14 0 0 1-1.1-.524l.15-.284c.35.186.713.358 1.078.512Zm12.893-1.021l-.17-.273c.337-.21.668-.437.984-.675l.193.257q-.494.367-1.011.691Zm-15.053-.122c-.341-.22-.676-.459-1-.708l.2-.253c.312.243.64.476.972.691Zm17-1.346l-.215-.239q.443-.4.851-.836l.235.219c-.278.297-.571.585-.872.851Zm-18.925-.153c-.3-.276-.585-.569-.856-.87l.239-.215c.265.294.547.58.836.85Zm20.587-1.632l-.253-.2c.244-.312.476-.639.692-.972l.27.175q-.333.516-.709.997M4.82 24.439a14 14 0 0 1-.692-1.007l.272-.17c.21.337.438.668.676.984Zm23.547-1.867l-.284-.151c.186-.35.358-.713.513-1.078l.3.125a15 15 0 0 1-.528 1.104Zm-24.841-.2l-.006-.012a13 13 0 0 1-.5-1.1l.3-.121c.147.362.312.724.491 1.074l.006.012Zm25.794-2.047l-.306-.1c.122-.377.23-.764.319-1.15l.313.072c-.091.396-.2.792-.326 1.178m-26.712-.218c-.12-.388-.223-.786-.308-1.182l.314-.067c.083.387.184.776.3 1.155Zm27.262-2.161l-.318-.045c.056-.393.094-.793.115-1.188l.321.017a14 14 0 0 1-.118 1.216M2.1 17.72c-.05-.4-.082-.812-.1-1.218l.321-.011c.014.4.046.8.094 1.19Zm27.582-2.2c-.014-.4-.045-.8-.093-1.19l.319-.039c.049.4.082.813.1 1.218ZM2.331 15.3l-.321-.02c.021-.405.061-.814.117-1.216l.318.045c-.055.391-.093.791-.114 1.191m27.057-2.144a14 14 0 0 0-.3-1.155l.312-.101c.119.388.223.786.307 1.183Zm-26.725-.222l-.313-.072q.137-.599.326-1.177l.306.1c-.123.376-.23.763-.319 1.149m26.026-2.062a13 13 0 0 0-.5-1.086l.286-.146c.185.363.355.736.507 1.111ZM3.4 10.665l-.3-.125c.158-.374.334-.745.524-1.1l.284.15c-.184.347-.356.71-.508 1.075m1.113-2.108l-.27-.174q.332-.513.707-1l.254.2q-.367.475-.691.974m1.464-1.881l-.235-.219c.276-.3.569-.585.87-.857l.215.239c-.294.261-.58.547-.85.837m1.77-1.6l-.193-.257c.323-.244.662-.477 1.007-.692l.17.272c-.337.215-.668.442-.984.68Zm15.705-.558l-.018-.012l.175-.27l.018.011Zm-1.047-.616a13 13 0 0 0-1.078-.512l.125-.3c.374.158.745.334 1.1.524ZM9.769 3.815l-.146-.286l.018-.009c.356-.181.724-.349 1.093-.5l.121.3c-.361.147-.72.311-1.068.488Zm10.44-.838a13 13 0 0 0-1.151-.317l.072-.313q.6.137 1.178.325Zm-8.229-.06l-.094-.307a14 14 0 0 1 1.182-.308l.067.314a14 14 0 0 0-1.155.301m5.9-.473a14 14 0 0 0-1.188-.113l.016-.321c.405.021.814.059 1.216.115Zm-3.572-.026l-.04-.319c.4-.05.812-.083 1.218-.1l.012.321c-.392.017-.793.049-1.186.098Z"/><circle cx="16" cy="15.998" r="10.708" fill="navy"/><circle cx="20.435" cy="11.562" r="3.136" fill="#fff"/><circle cx="26.708" cy="5.29" r="3.137" fill="navy"/><path fill="#fff" d="M13.1 21.352v-.79H9.629v-6.236h-.9v7.026zm4.816 0V16.3h-.8v2.785c0 1.031-.54 1.706-1.378 1.706A.95.95 0 0 1 14.7 19.8v-3.5h-.8v3.817c0 .838.626 1.378 1.609 1.378a1.86 1.86 0 0 0 1.687-.925v.781h.723m5.872-.018v-.607a.7.7 0 0 1-.173.019c-.279 0-.434-.145-.434-.4v-2.809c0-.9-.655-1.378-1.9-1.378c-1.224 0-1.976.472-2.024 1.638h.81c.067-.617.434-.9 1.185-.9c.723 0 1.128.27 1.128.752v.212c0 .337-.2.482-.838.559a5.8 5.8 0 0 0-1.619.308a1.33 1.33 0 0 0-.887 1.311c0 .916.636 1.455 1.658 1.455a2.36 2.36 0 0 0 1.715-.742a.855.855 0 0 0 .829.665a2 2 0 0 0 .549-.087m-1.407-1.725a1.366 1.366 0 0 1-1.513 1.185c-.626 0-.993-.222-.993-.771c0-.53.357-.761 1.214-.887a4 4 0 0 0 1.291-.279v.752"/></svg>', // lua
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="vscodeIconsFileTypeRuby0" x1="-235.957" x2="-235.986" y1="-308.579" y2="-308.527" gradientTransform="matrix(202.935 0 0 -202.78 47910.461 -62541.16)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fb7655"/><stop offset=".41" stop-color="#e42b1e"/><stop offset=".99" stop-color="#900"/><stop offset="1" stop-color="#900"/></linearGradient><linearGradient id="vscodeIconsFileTypeRuby1" x1="-235.571" x2="-235.697" y1="-309.087" y2="-309.041" gradientTransform="matrix(60.308 0 0 -111.778 14236.351 -34525.395)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#871101"/><stop offset=".99" stop-color="#911209"/><stop offset="1" stop-color="#911209"/></linearGradient><linearGradient id="vscodeIconsFileTypeRuby2" x1="-235.896" x2="-235.937" y1="-313.362" y2="-313.129" gradientTransform="matrix(188.32 0 0 -21.986 44447.302 -6856.882)" href="#vscodeIconsFileTypeRuby1"/><linearGradient id="vscodeIconsFileTypeRuby3" x1="-233.515" x2="-233.497" y1="-309.082" y2="-309.161" gradientTransform="matrix(65.222 0 0 -97.1 15237.802 -29991.814)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".23" stop-color="#e57252"/><stop offset=".46" stop-color="#de3b20"/><stop offset=".99" stop-color="#a60003"/><stop offset="1" stop-color="#a60003"/></linearGradient><linearGradient id="vscodeIconsFileTypeRuby4" x1="-235.314" x2="-235.31" y1="-309.534" y2="-309.607" gradientTransform="matrix(105.32 0 0 -106.825 24798.925 -33053.152)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".23" stop-color="#e4714e"/><stop offset=".56" stop-color="#be1a0d"/><stop offset=".99" stop-color="#a80d00"/><stop offset="1" stop-color="#a80d00"/></linearGradient><linearGradient id="vscodeIconsFileTypeRuby5" x1="-235.882" x2="-235.869" y1="-311.851" y2="-311.935" gradientTransform="matrix(94.321 0 0 -66.418 22271.499 -20707.004)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".18" stop-color="#e46342"/><stop offset=".4" stop-color="#c82410"/><stop offset=".99" stop-color="#a80d00"/><stop offset="1" stop-color="#a80d00"/></linearGradient><linearGradient id="vscodeIconsFileTypeRuby6" x1="-235.412" x2="-235.333" y1="-321.074" y2="-320.958" gradientTransform="matrix(70.767 0 0 -24.301 16678.116 -7798.647)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".54" stop-color="#c81f11"/><stop offset=".99" stop-color="#bf0905"/><stop offset="1" stop-color="#bf0905"/></linearGradient><linearGradient id="vscodeIconsFileTypeRuby7" x1="-223.821" x2="-223.796" y1="-310.116" y2="-310.18" gradientTransform="matrix(18.177 0 0 -72.645 4071.017 -22510.233)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".31" stop-color="#de4024"/><stop offset=".99" stop-color="#bf190b"/><stop offset="1" stop-color="#bf190b"/></linearGradient><linearGradient id="vscodeIconsFileTypeRuby8" x1="-235.561" x2="-235.424" y1="-309.258" y2="-309.116" gradientTransform="matrix(158.162 0 0 -157.937 37256.313 -48819.382)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#bd0012"/><stop offset=".07" stop-color="#fff"/><stop offset=".17" stop-color="#fff"/><stop offset=".27" stop-color="#c82f1c"/><stop offset=".33" stop-color="#820c01"/><stop offset=".46" stop-color="#a31601"/><stop offset=".72" stop-color="#b31301"/><stop offset=".99" stop-color="#e82609"/><stop offset="1" stop-color="#e82609"/></linearGradient><linearGradient id="vscodeIconsFileTypeRuby9" x1="-235.424" x2="-235.476" y1="-309.143" y2="-309.126" gradientTransform="matrix(127.074 0 0 -97.409 29932.229 -30086.947)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8c0c01"/><stop offset=".54" stop-color="#990c00"/><stop offset=".99" stop-color="#a80d0e"/><stop offset="1" stop-color="#a80d0e"/></linearGradient><linearGradient id="vscodeIconsFileTypeRubya" x1="-235.839" x2="-235.901" y1="-309.604" y2="-309.555" gradientTransform="matrix(94.011 0 0 -105.603 22198.743 -32676.856)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7e110b"/><stop offset=".99" stop-color="#9e0c00"/><stop offset="1" stop-color="#9e0c00"/></linearGradient><linearGradient id="vscodeIconsFileTypeRubyb" x1="-235.854" x2="-235.891" y1="-311.24" y2="-311.202" gradientTransform="matrix(79.702 0 0 -81.791 18827.397 -25447.905)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#79130d"/><stop offset=".99" stop-color="#9e120b"/><stop offset="1" stop-color="#9e120b"/></linearGradient><linearGradient id="vscodeIconsFileTypeRubyc" x1="-231.241" x2="-231.299" y1="-309.435" y2="-309.337" gradientTransform="matrix(40.137 0 0 -81.143 9286.998 -25078.589)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8b2114"/><stop offset=".43" stop-color="#9e100a"/><stop offset=".99" stop-color="#b3100c"/><stop offset="1" stop-color="#b3100c"/></linearGradient><linearGradient id="vscodeIconsFileTypeRubyd" x1="-235.898" x2="-235.831" y1="-317.466" y2="-317.537" gradientTransform="matrix(78.099 0 0 -32.624 18447.361 -10353.553)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b31000"/><stop offset=".44" stop-color="#910f08"/><stop offset=".99" stop-color="#791c12"/><stop offset="1" stop-color="#791c12"/></linearGradient><radialGradient id="vscodeIconsFileTypeRubye" cx="-235.882" cy="-312.543" r=".076" gradientTransform="matrix(93.113 0 0 -48.655 21986.073 -15193.61)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a80d00"/><stop offset=".99" stop-color="#7e0e08"/><stop offset="1" stop-color="#7e0e08"/></radialGradient><radialGradient id="vscodeIconsFileTypeRubyf" cx="-235.282" cy="-309.704" r=".097" gradientTransform="matrix(97.434 0 0 -75.848 22937.057 -23467.84)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a30c00"/><stop offset=".99" stop-color="#800e08"/><stop offset="1" stop-color="#800e08"/></radialGradient></defs><path fill="url(#vscodeIconsFileTypeRuby0)" d="M23.693 20.469L7.707 29.961l20.7-1.4L30 7.685Z"/><path fill="url(#vscodeIconsFileTypeRuby1)" d="m28.44 28.542l-1.779-12.279l-4.846 6.4Z"/><path fill="url(#vscodeIconsFileTypeRuby2)" d="M28.464 28.542L15.43 27.519l-7.654 2.415Z"/><path fill="url(#vscodeIconsFileTypeRuby3)" d="M7.794 29.937L11.05 19.27L3.885 20.8Z"/><path fill="url(#vscodeIconsFileTypeRuby4)" d="m21.813 22.7l-3-11.735L10.243 19Z"/><path fill="url(#vscodeIconsFileTypeRuby5)" d="m29.32 11.127l-8.1-6.619l-2.257 7.3Z"/><path fill="url(#vscodeIconsFileTypeRuby6)" d="m25.53 2.148l-4.767 2.634l-3.007-2.67Z"/><path fill="url(#vscodeIconsFileTypeRuby7)" d="m2 24.38l2-3.642L2.382 16.4Z"/><path fill="#fff" d="m2.274 16.263l1.626 4.61l7.062-1.584l8.062-7.489L21.3 4.569l-3.583-2.53l-6.091 2.28C9.706 6.1 5.982 9.635 5.848 9.7s-2.459 4.464-3.574 6.562Z"/><path fill="url(#vscodeIconsFileTypeRuby8)" d="M7.981 7.981C12.14 3.858 17.5 1.421 19.559 3.5s-.124 7.121-4.283 11.244s-9.455 6.69-11.511 4.614s.057-7.258 4.216-11.377"/><path fill="url(#vscodeIconsFileTypeRuby9)" d="m7.794 29.933l3.231-10.7l10.729 3.447c-3.879 3.638-8.194 6.713-13.96 7.254Z"/><path fill="url(#vscodeIconsFileTypeRubya)" d="m19.038 11.774l2.754 10.91c3.24-3.407 6.149-7.07 7.573-11.6z"/><path fill="url(#vscodeIconsFileTypeRubyb)" d="M29.337 11.139c1.1-3.327 1.357-8.1-3.841-8.985l-4.265 2.355z"/><path fill="#9e1209" d="M2 24.332c.153 5.49 4.114 5.572 5.8 5.62l-3.9-9.1z"/><path fill="url(#vscodeIconsFileTypeRubye)" d="M19.053 11.791c2.49 1.531 7.509 4.6 7.61 4.661a17.6 17.6 0 0 0 2.619-5.343z"/><path fill="url(#vscodeIconsFileTypeRubyf)" d="m11.021 19.232l4.319 8.332a28 28 0 0 0 6.385-4.88l-10.7-3.452Z"/><path fill="url(#vscodeIconsFileTypeRubyc)" d="m3.887 20.861l-.612 7.287c1.155 1.577 2.743 1.714 4.409 1.591c-1.205-3-3.614-9-3.8-8.878Z"/><path fill="url(#vscodeIconsFileTypeRubyd)" d="m21.206 4.528l8.58 1.2c-.458-1.94-1.864-3.192-4.261-3.584l-4.319 2.38Z"/></svg>', // ruby
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#ededed" d="M29.25 13.8a6.9 6.9 0 0 0-.742-2.268a1 1 0 0 0-.172-.233a9.5 9.5 0 0 1-1.725-2.4a8.6 8.6 0 0 0-1.395-2.382A6.9 6.9 0 0 1 24.1 4.644a4.57 4.57 0 0 0-2.11-2.917a1 1 0 0 0-.1-.054a9 9 0 0 0-1.3-.468a1 1 0 0 0-.263-.035a1 1 0 0 0-.2.021a6 6 0 0 1-.807.107c-.05 0-.1-.006-.149-.006a2.84 2.84 0 0 0-1.416.453c-.094.052-.188.106-.284.149q-.041.018-.078.039a1.6 1.6 0 0 1-.327.067a3 3 0 0 0-.772.194a1 1 0 0 0-.508.483a2.2 2.2 0 0 1-.469.5a4.4 4.4 0 0 0-.762.823a1 1 0 0 0-.116.234a4.7 4.7 0 0 1-1.574 2.2a6.5 6.5 0 0 0-.8.613a2.73 2.73 0 0 0-.627-1.634l-.053-.056v-.014a2.4 2.4 0 0 0-.135-.586a1 1 0 0 0-.132-.236a5.2 5.2 0 0 0-1.607-1.408a1 1 0 0 0-.346-.119a2 2 0 0 1-.148-.077a2.06 2.06 0 0 0-1-.311a1.5 1.5 0 0 0-.681.166a1 1 0 0 0-.274.206a1 1 0 0 1-.125.063a1.9 1.9 0 0 0-.908.778a2.5 2.5 0 0 0-.541.106a1.7 1.7 0 0 1-.383.057a2.3 2.3 0 0 0-1.5.545l-.106.1a2.53 2.53 0 0 0-1 2.525a1 1 0 0 0 .068.165a2.3 2.3 0 0 0 1.879 1.161c-.1.238-.2.473-.314.7a1 1 0 0 0-.087.293A11 11 0 0 0 4 12.039q-.002.03.007.06a5 5 0 0 1 .041.547a2.93 2.93 0 0 0 .931 2.4l.052.039l.008.031a3 3 0 0 0 .151.447a1.2 1.2 0 0 0 .632.617a1.3 1.3 0 0 0 .248.571a1 1 0 0 0 .332.279a2.5 2.5 0 0 0 .465.176l.064.018a1 1 0 0 0 .192.171a6 6 0 0 1 .75.605a1.13 1.13 0 0 0 1.351.427a1.5 1.5 0 0 0 .765.215a1.4 1.4 0 0 0 .624-.145l.114-.026q.036.613.028 1.223a1 1 0 0 0 .026.242a11 11 0 0 1 .266 1.828a1 1 0 0 0 .031.2a8.5 8.5 0 0 1 .268 1.815q-.002.047.008.094a6.1 6.1 0 0 1-.61 3.575a1 1 0 0 0-.089.261a1 1 0 0 0-.234.079l-.05.022a2 2 0 0 0-1.2 1.065a1.32 1.32 0 0 0 .074 1.054a1 1 0 0 0 .324.371a3.55 3.55 0 0 0 3.509.3a1.55 1.55 0 0 0 .829-1.653l-.005-.067a1 1 0 0 0 .056-.158a11 11 0 0 0 .288-2.068a9 9 0 0 1 .259-1.822a4.7 4.7 0 0 0 .389-1.588l.042.048a13 13 0 0 0 1.255 1.129a10 10 0 0 1 1.1.989l-.011.038a.53.53 0 0 1-.342.359l-.049.017a1.92 1.92 0 0 0-1.184 1.334a1.31 1.31 0 0 0 .452 1.234a1 1 0 0 0 .441.222a4.9 4.9 0 0 0 2.735-.181a1.6 1.6 0 0 0 .266-.124a1.4 1.4 0 0 0 .97.372a2.3 2.3 0 0 0 1-.274c.049-.023.1-.045.14-.062a1 1 0 0 0 .637-.864a4.55 4.55 0 0 0-.468-2.343a1.56 1.56 0 0 0-.51-.6a10.8 10.8 0 0 1 1.3-2.15a2.2 2.2 0 0 0 .451-2.026a2.5 2.5 0 0 1-.043-.394a1 1 0 0 0 0-.148a5.8 5.8 0 0 1 .012-1.279a7.2 7.2 0 0 0 .951 1.793a8 8 0 0 1 .133 1.1a11 11 0 0 0 .133 1.186a9.4 9.4 0 0 1-.224 3.9a1 1 0 0 0-.032.34a1 1 0 0 0-.1.179a2.24 2.24 0 0 0-.312 1.235a1 1 0 0 0 .039.2a1.315 1.315 0 0 0 1.328.963q.13-.001.268-.014h.019l.038.013a2.11 2.11 0 0 0 2.517-1.088a1 1 0 0 0 .058-.735a5.3 5.3 0 0 1-.208-1.027a1 1 0 0 0-.046-.217a6.5 6.5 0 0 1-.221-3.22a1 1 0 0 0 .015-.114a4 4 0 0 1 .074-.443a2.74 2.74 0 0 0-.193-2.1a4 4 0 0 1 .021-.476c.011-.147.023-.3.027-.463a1.6 1.6 0 0 0 .862-.851a13 13 0 0 0 .947-2.23a1.72 1.72 0 0 0 .172-1.185a1.2 1.2 0 0 0 .111-.251a1.47 1.47 0 0 0-.215-1.236m-10.387 8.968c-.026 0-.053-.008-.08-.01h-.024a3 3 0 0 1-.236-.323a9 9 0 0 0-.178-.258a2 2 0 0 0 .208-.234a1.25 1.25 0 0 0 .629-.321a3.2 3.2 0 0 1-.319 1.146"/><path fill="#3a3c5b" d="M19.289 2.3c-.548-.065-.961.3-1.419.506c-.368.206-.815.152-1.185.309c-.282.579-.941.908-1.3 1.443a5.7 5.7 0 0 1-1.942 2.694a5.46 5.46 0 0 0-2.368 3.394c-.145.3-.122.746-.277 1c-.511.143-.239-.516-.3-.825c-.074-.47.341-.77.373-1.226a1.83 1.83 0 0 0 .209-1.053c-.056-.814.189-1.807-.393-2.477c-.349-.2-.239-.623-.366-.947a4.2 4.2 0 0 0-1.3-1.139c-.419-.041-.806-.542-1.232-.323c-.266.309-.763.305-.922.713c-.1.516-.688.374-1.068.5c-.488.185-1.118.006-1.518.382c-.411.41-1.034.961-.835 1.606c.457.882 1.645.438 2.317.974a18 18 0 0 1-.727 1.779a10 10 0 0 0-.044 2.332c.123.773-.083 1.772.606 2.319c.38.137.357.572.5.887c.134.29.427-.113.543.193c.338.184.037.561.22.8c.263.137.639.128.822.426a7 7 0 0 1 .975.806c.23.467.531-.454.783-.109c.17.285.506.522.819.285a3 3 0 0 0 1.324-.556a18 18 0 0 1 .171 2.718a12 12 0 0 1 .29 2a9.4 9.4 0 0 1 .3 2.03a7.1 7.1 0 0 1-.709 4.16a1.01 1.01 0 0 1-.807.8c-.291.13-.9.366-.692.776a2.55 2.55 0 0 0 2.52.214c.51-.243.073-.858.334-1.226c.343-1.3.174-2.691.575-3.985a3.76 3.76 0 0 0 .3-2.1c.079-.44-.105-.969.187-1.329a1.8 1.8 0 0 1 .483-1.2a15 15 0 0 0 .144-2.026a3.2 3.2 0 0 1 1.267-.127c.018.375-.272.812-.19 1.234A1.95 1.95 0 0 1 15.5 20.3a2.85 2.85 0 0 0 .168 2.308c.782.839 1.8 1.432 2.536 2.327c.314.205.2.517.038.784a1.53 1.53 0 0 1-.987 1.034c-.308.121-.806.566-.442.882a3.9 3.9 0 0 0 2.178-.144c.476-.171.3-.738.488-1.088c.3.233.423.765.711 1.069c.3.433.807.073 1.156-.062a3.55 3.55 0 0 0-.372-1.842c-.167-.378-.8-.385-.77-.852a11.8 11.8 0 0 1 1.712-3c.51-.479.13-1.191.158-1.8a6.77 6.77 0 0 1 1.084-4.416a16 16 0 0 0 .692 2.14a6.2 6.2 0 0 0 1.1 2.246c.237.811.176 1.71.331 2.551a10.4 10.4 0 0 1-.242 4.347c.04.518-.457.9-.415 1.408c.14.469.7.093.99.29a1.11 1.11 0 0 0 1.324-.572a6.2 6.2 0 0 1-.247-1.223a7.45 7.45 0 0 1-.255-3.719c.046-.669.457-1.5-.073-2.072c-.148-.619.1-1.285-.049-1.915a12.9 12.9 0 0 1-.122-4.933c.093-.227.013-.649.247-.775a1.85 1.85 0 0 1 .315 1.232a3.7 3.7 0 0 1 .079 2.081c-.424.531-.163 1.248-.109 1.85c.068.422.516.118.589-.144a12 12 0 0 0 .944-2.241c.269-.356.014-.77 0-1.142c.413-.049.256-.506.035-.7a5.9 5.9 0 0 0-.667-2.2a10.5 10.5 0 0 1-1.941-2.723c-.528-1.639-2.042-2.726-2.556-4.379a3.56 3.56 0 0 0-1.652-2.317a8 8 0 0 0-1.156-.42a6.5 6.5 0 0 1-1.031.13m.4 14.66a39 39 0 0 1 .5 4.291a4.18 4.18 0 0 1-.76 2.517c-.12.425-.486.012-.751-.016c-.643-.018-.882-.683-1.232-1.107c-.36-.344-.1-.8.133-1.131c.252-.179.35-.579.708-.548c.4-.007.316-.487.26-.743c.238-.362.092-.892.328-1.283c.419-.182.294-.82.442-1.18c.115-.256.017-.749.334-.854q.054-.009.042.052Z"/></svg>', // perl
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#005f91" d="M10.676 15.973a10.05 10.05 0 0 0 1.175 5.151a5.446 5.446 0 0 0 6.306 2.408a4.28 4.28 0 0 0 3.09-3.6l.109-.61c1.737.251 4.537.658 6.274.906l-.11.44a11.26 11.26 0 0 1-2.7 5.39a9.44 9.44 0 0 1-5.366 2.688a14.6 14.6 0 0 1-8.277-.819a10.15 10.15 0 0 1-5.777-6.24a16.23 16.23 0 0 1 .019-11.45a10.54 10.54 0 0 1 8.963-7.054a13.35 13.35 0 0 1 6.666.555a9.57 9.57 0 0 1 6.167 6.9c.094.352.114.417.114.417c-1.932.351-4.319.8-6.238 1.215c-.362-1.915-1.265-3.428-3.2-3.9a5.263 5.263 0 0 0-6.616 3.57a10.5 10.5 0 0 0-.385 1.439a12.3 12.3 0 0 0-.214 2.594"/></svg>', // C
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="none" stroke="#cc6699" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m6.75 7.5l3 2.25l-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25"/></svg>', // shell

    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#1572b6" d="M5.902 27.201L3.656 2h24.688l-2.249 25.197L15.985 30z"/><path fill="#33a9dc" d="m16 27.858l8.17-2.265l1.922-21.532H16z"/><path fill="#fff" d="M16 13.191h4.09l.282-3.165H16V6.935h7.75l-.074.829l-.759 8.518H16z"/><path fill="#ebebeb" d="m16.019 21.218l-.014.004l-3.442-.93l-.22-2.465H9.24l.433 4.853l6.331 1.758l.015-.004z"/><path fill="#fff" d="m19.827 16.151l-.372 4.139l-3.447.93v3.216l6.336-1.756l.047-.522l.537-6.007z"/><path fill="#ebebeb" d="M16.011 6.935v3.091H8.545l-.062-.695l-.141-1.567l-.074-.829zM16 13.191v3.091h-3.399l-.062-.695l-.14-1.567l-.074-.829z"/></svg>', // css
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#e44f26" d="M5.902 27.201L3.655 2h24.69l-2.25 25.197L15.985 30z"/><path fill="#f1662a" d="m16 27.858l8.17-2.265l1.922-21.532H16z"/><path fill="#ebebeb" d="M16 13.407h-4.09l-.282-3.165H16V7.151H8.25l.074.83l.759 8.517H16zm0 8.027l-.014.004l-3.442-.929l-.22-2.465H9.221l.433 4.852l6.332 1.758l.014-.004z"/><path fill="#fff" d="M15.989 13.407v3.091h3.806l-.358 4.009l-3.448.93v3.216l6.337-1.757l.046-.522l.726-8.137l.076-.83zm0-6.256v3.091h7.466l.062-.694l.141-1.567l.074-.83z"/></svg>', // html
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#5382a1" d="M12.7 23.56s-1.07.622.761.833a16 16 0 0 0 5.8-.246a10 10 0 0 0 1.539.753c-5.481 2.349-12.405-.136-8.1-1.339m-.674-3.067s-1.2.888.633 1.078a22.6 22.6 0 0 0 7.481-.359a3.3 3.3 0 0 0 1.152.7c-6.627 1.938-14.009.153-9.266-1.421"/><path fill="#e76f00" d="M17.673 15.294a2.05 2.05 0 0 1-.355 2.954s3.429-1.77 1.854-3.987c-1.471-2.067-2.6-3.095 3.508-6.636c0 0-9.586 2.394-5.007 7.669"/><path fill="#5382a1" d="M24.922 25.827s.792.652-.872 1.157c-3.164.958-13.168 1.248-15.948.038c-1-.435.874-1.038 1.464-1.164a3.8 3.8 0 0 1 .966-.108c-1.111-.783-7.181 1.537-3.083 2.2c11.176 1.812 20.372-.816 17.473-2.124m-11.711-8.508s-5.089 1.209-1.8 1.648a38 38 0 0 0 6.731-.072a53 53 0 0 0 4.221-.555a9 9 0 0 0-1.28.685c-5.17 1.358-15.153.726-12.283-.665a9.6 9.6 0 0 1 4.407-1.042m9.133 5.104c5.253-2.73 2.824-5.353 1.129-5a4 4 0 0 0-.6.161a.96.96 0 0 1 .449-.346c3.354-1.179 5.933 3.478-1.083 5.322a.5.5 0 0 0 .106-.138"/><path fill="#e76f00" d="M19.172 1.906s2.909 2.91-2.759 7.386c-4.546 3.59-1.037 5.637 0 7.975c-2.653-2.394-4.6-4.5-3.294-6.463c1.917-2.879 7.229-4.275 6.056-8.9"/><path fill="#5382a1" d="M13.727 29.818c5.042.323 12.786-.179 12.969-2.565c0 0-.353.9-4.167 1.623a41.5 41.5 0 0 1-12.76.2s.645.533 3.959.746"/></svg>', // java
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="vscodeIconsFileTypeLess0" x1="-3.609" x2="-3.609" y1="-492.685" y2="-480.271" gradientTransform="translate(19.712 502.891)" gradientUnits="userSpaceOnUse"><stop offset=".15" stop-color="#2a4f84"/><stop offset=".388" stop-color="#294e82"/><stop offset="1" stop-color="#172e4e"/></linearGradient></defs><path fill="url(#vscodeIconsFileTypeLess0)" d="M28.559 20.226a2.4 2.4 0 0 1-2.394 2.394H6.04a2.4 2.4 0 0 1-2.394-2.394V12.6a2.4 2.4 0 0 1 2.394-2.394h20.125a2.4 2.4 0 0 1 2.394 2.394Z"/><path fill="#f6f6f6" d="M24.349 16.25a1.97 1.97 0 0 1 1.578 1.891a1.69 1.69 0 0 1-.653 1.4a2.93 2.93 0 0 1-1.862.559a4.56 4.56 0 0 1-2.241-.618a2 2 0 0 1 .16-.669a1.8 1.8 0 0 1 .35-.576a3.7 3.7 0 0 0 1.649.493a.97.97 0 0 0 .51-.112a.34.34 0 0 0 .178-.3q0-.353-.546-.529l-.653-.247q-1.482-.54-1.482-1.762a1.75 1.75 0 0 1 .623-1.416a2.6 2.6 0 0 1 1.678-.648a5 5 0 0 1 1.15.147a4.6 4.6 0 0 1 1.032.472a1.7 1.7 0 0 1-.13.722a1.2 1.2 0 0 1-.38.558a4.3 4.3 0 0 0-1.66-.446a.54.54 0 0 0-.362.106a.34.34 0 0 0-.124.27q0 .282.451.446l.736.259Zm-5.249 0a1.97 1.97 0 0 1 1.577 1.891a1.69 1.69 0 0 1-.652 1.4a2.94 2.94 0 0 1-1.862.559a4.56 4.56 0 0 1-2.241-.618a2 2 0 0 1 .16-.669a1.8 1.8 0 0 1 .35-.576a3.7 3.7 0 0 0 1.649.493a.96.96 0 0 0 .51-.112a.34.34 0 0 0 .178-.3q0-.353-.546-.529l-.653-.247q-1.482-.54-1.482-1.762a1.75 1.75 0 0 1 .623-1.416a2.6 2.6 0 0 1 1.677-.648a5 5 0 0 1 1.15.147a4.6 4.6 0 0 1 1.032.472a1.7 1.7 0 0 1-.13.722a1.2 1.2 0 0 1-.38.558a4.3 4.3 0 0 0-1.661-.446a.54.54 0 0 0-.362.106a.34.34 0 0 0-.124.27q0 .282.451.446zm-3.836.083a2.8 2.8 0 0 0-.172-1a2.2 2.2 0 0 0-.492-.787a2.3 2.3 0 0 0-.777-.517a2.7 2.7 0 0 0-1.026-.314a2.8 2.8 0 0 0-1.18.361a2.26 2.26 0 0 0-.83.646a2.8 2.8 0 0 0-.487.969a4.4 4.4 0 0 0-.16 1.216a5.7 5.7 0 0 0 .13 1.257a2.6 2.6 0 0 0 .445 1a2.1 2.1 0 0 0 .818.657a2.9 2.9 0 0 0 1.251.277a3.95 3.95 0 0 0 2.324-.712a1.87 1.87 0 0 0-.484-1.081a6 6 0 0 1-.857.262a3.2 3.2 0 0 1-.656.079a1.02 1.02 0 0 1-.815-.29a1.2 1.2 0 0 1-.271-.77h3.083a4.5 4.5 0 0 0 .156-1.253m-3.248.081a2.4 2.4 0 0 1 .218-1a.63.63 0 0 1 .559-.264a.66.66 0 0 1 .582.282a1.75 1.75 0 0 1 .194.856v.13h-1.553Z"/><path fill="#f6f6f6" stroke="#404040" stroke-miterlimit="10" stroke-width=".25" d="M29.18 17.2a1.6 1.6 0 0 0-.53 1.265v2.051a1.81 1.81 0 0 1-.683 1.557a2.8 2.8 0 0 1-1.654.549h-.373v-1.028a1.24 1.24 0 0 0 .595-.334a1.37 1.37 0 0 0 .419-1.047v-1.657a2.55 2.55 0 0 1 .257-1.323a2.5 2.5 0 0 1 1.2-.838a2.53 2.53 0 0 1-1.324-1.179a3 3 0 0 1-.135-1.165v-1.518a1.46 1.46 0 0 0-.366-1.054a1.15 1.15 0 0 0-.648-.314v-.96h.928a1.68 1.68 0 0 1 1.023.442a2 2 0 0 1 .673 1.009a2.3 2.3 0 0 1 .086.7v1.757a1.85 1.85 0 0 0 .5 1.383a2.1 2.1 0 0 0 .854.479v.794a1.94 1.94 0 0 0-.82.426ZM5.594 10.206H5.26a1.67 1.67 0 0 0-1.023.442a1.7 1.7 0 0 0-.673 1.009a3.5 3.5 0 0 0-.038.7v1.757a1.87 1.87 0 0 1-.545 1.386a2.9 2.9 0 0 1-.981.477v.793a2.55 2.55 0 0 1 .947.426a1.64 1.64 0 0 1 .577 1.265v2.051a1.78 1.78 0 0 0 .636 1.558a2.8 2.8 0 0 0 1.654.55h.421v-1.026a1.5 1.5 0 0 1-.643-.334a1.36 1.36 0 0 1-.371-1.047v-1.656a2.5 2.5 0 0 0-.305-1.323a2.5 2.5 0 0 0-1.2-.838a2.53 2.53 0 0 0 1.324-1.178a2.9 2.9 0 0 0 .183-1.165v-1.519a1.46 1.46 0 0 1 .317-1.054a1.3 1.3 0 0 1 .575-.271h.428v-1.003z"/><path fill="#f6f6f6" d="M9.537 18.529h-.32c-.348 0-.479-.183-.479-.551v-6.759a1.26 1.26 0 0 0-.268-.856c-.15-.164-.411-.162-.783-.162h-.808v8.106a1.88 1.88 0 0 0 .352 1.24a1.44 1.44 0 0 0 1.145.393a8 8 0 0 0 1.269-.118a2.2 2.2 0 0 0 .036-.509a2.3 2.3 0 0 0-.142-.782Z"/></svg>', // less
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#fbc02d" d="M4.014 14.976a2.5 2.5 0 0 0 1.567-.518a2.38 2.38 0 0 0 .805-1.358a15.3 15.3 0 0 0 .214-2.944q.012-2.085.075-2.747a5.2 5.2 0 0 1 .418-1.686a3 3 0 0 1 .755-1.018A3.05 3.05 0 0 1 9 4.125A6.8 6.8 0 0 1 10.544 4h.7v1.96h-.387a2.34 2.34 0 0 0-1.723.468a3.4 3.4 0 0 0-.425 2.092a36 36 0 0 1-.137 4.133a4.7 4.7 0 0 1-.768 2.06A4.6 4.6 0 0 1 6.1 16a3.8 3.8 0 0 1 1.992 1.754a8.9 8.9 0 0 1 .618 3.865q0 2.435.05 2.9a1.76 1.76 0 0 0 .504 1.181a2.64 2.64 0 0 0 1.592.337h.387V28h-.7a5.7 5.7 0 0 1-1.773-.2a2.97 2.97 0 0 1-1.324-.93a3.35 3.35 0 0 1-.681-1.63a24 24 0 0 1-.165-3.234a16.5 16.5 0 0 0-.214-3.106a2.4 2.4 0 0 0-.805-1.361a2.5 2.5 0 0 0-1.567-.524Zm23.972 2.035a2.5 2.5 0 0 0-1.567.524a2.4 2.4 0 0 0-.805 1.361a16.5 16.5 0 0 0-.212 3.109a24 24 0 0 1-.169 3.234a3.35 3.35 0 0 1-.681 1.63a2.97 2.97 0 0 1-1.324.93a5.7 5.7 0 0 1-1.773.2h-.7V26.04h.387a2.64 2.64 0 0 0 1.592-.337a1.76 1.76 0 0 0 .506-1.186q.05-.462.05-2.9a8.9 8.9 0 0 1 .618-3.865A3.8 3.8 0 0 1 25.9 16a4.6 4.6 0 0 1-1.7-1.286a4.7 4.7 0 0 1-.768-2.06a36 36 0 0 1-.137-4.133a3.4 3.4 0 0 0-.425-2.092a2.34 2.34 0 0 0-1.723-.468h-.387V4h.7a6.8 6.8 0 0 1 1.54.125a3.05 3.05 0 0 1 1.149.581a3 3 0 0 1 .755 1.018a5.2 5.2 0 0 1 .418 1.686q.062.662.075 2.747a15.3 15.3 0 0 0 .212 2.947a2.38 2.38 0 0 0 .805 1.355a2.5 2.5 0 0 0 1.567.518Z"/></svg>', // json
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#fbc02d" d="M2 12.218c.755 0 1.51-.008 2.264 0l.053.038l2.761 2.758c.891-.906 1.8-1.794 2.7-2.7c.053-.052.11-.113.192-.1h1.823a1.4 1.4 0 0 1 .353.019c-.7.67-1.377 1.369-2.069 2.05L5.545 18.8c-.331.324-.648.663-.989.975c-.754.022-1.511.007-2.266.007c1.223-1.209 2.431-2.433 3.658-3.637c-1.321-1.304-2.63-2.62-3.948-3.927m10.7 0h1.839v7.566c-.611 0-1.222.012-1.832-.008v-4.994c-1.6 1.607-3.209 3.2-4.811 4.8c-.089.08-.166.217-.305.194c-.824-.006-1.649 0-2.474 0Q8.916 16 12.7 12.218m2.258.002c.47-.009.939 0 1.409 0c.836.853 1.69 1.689 2.536 2.532q1.268-1.267 2.539-2.532h1.4q-.008 3.784 0 7.567c-.471 0-.943.006-1.414 0q.008-2.387 0-4.773c-.844.843-1.676 1.7-2.526 2.536c-.856-.835-1.687-1.695-2.532-2.541c0 1.594-.006 3.188.006 4.781c-.472 0-.943.005-1.415 0q-.003-3.79-.003-7.57m8.301-.003c.472 0 .944-.007 1.416 0q-.007 3.083 0 6.166h3.782c.063.006.144-.012.191.045c.448.454.907.9 1.353 1.354q-3.371.007-6.741 0q.007-3.782-.001-7.565"/></svg>', // yaml
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#c2c2c2" d="M22.038 2H6.375a1.755 1.755 0 0 0-1.75 1.75v24.5A1.755 1.755 0 0 0 6.375 30h19.25a1.755 1.755 0 0 0 1.75-1.75V6.856Zm.525 2.844l1.663 1.531h-1.663ZM6.375 28.25V3.75h14.438v4.375h4.813V28.25Z"/><path fill="#829ec2" d="M8.125 15.097h13.076v1.75H8.125zm0 9.342h9.762v1.75H8.125zm0-4.676h15.75v1.75H8.125zm0-9.533h15.75v1.75H8.125z"/></svg>', // txt
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path fill="currentColor" d="M48 180c0 11 7.18 20 16 20a14.24 14.24 0 0 0 10.22-4.66a8 8 0 0 1 11.56 11.06A30.06 30.06 0 0 1 64 216c-17.65 0-32-16.15-32-36s14.35-36 32-36a30.06 30.06 0 0 1 21.78 9.6a8 8 0 0 1-11.56 11.06A14.24 14.24 0 0 0 64 160c-8.82 0-16 9-16 20m79.6-8.69c-4-1.16-8.14-2.35-10.45-3.84c-1.25-.81-1.23-1-1.12-1.9a4.57 4.57 0 0 1 2-3.67c4.6-3.12 15.34-1.73 19.82-.56a8 8 0 0 0 4.15-15.48c-2.12-.55-21-5.22-32.84 2.76a20.58 20.58 0 0 0-9 14.95c-2 15.88 13.65 20.41 23 23.11c12.06 3.49 13.12 4.92 12.78 7.59c-.31 2.41-1.26 3.34-2.14 3.93c-4.6 3.06-15.17 1.56-19.55.36a8 8 0 0 0-4.31 15.44a61.3 61.3 0 0 0 15.19 2c5.82 0 12.3-1 17.49-4.46a20.82 20.82 0 0 0 9.19-15.23c2.19-17.31-14.32-22.14-24.21-25m83.09-26.84a8 8 0 0 0-10.23 4.84L188 184.21l-12.47-34.9a8 8 0 0 0-15.07 5.38l20 56a8 8 0 0 0 15.07 0l20-56a8 8 0 0 0-4.84-10.22M216 88v24a8 8 0 0 1-16 0V96h-48a8 8 0 0 1-8-8V40H56v72a8 8 0 0 1-16 0V40a16 16 0 0 1 16-16h96a8 8 0 0 1 5.66 2.34l56 56A8 8 0 0 1 216 88m-27.31-8L160 51.31V80Z"/></svg>', // csv
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M20 22H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1m-1-2V4H5v16zM8 7h8v2H8zm0 4h8v2H8zm0 4h5v2H8z"/></svg>', // log
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#c4c7ce" d="M8.562 15.256A21.2 21.2 0 0 0 16 16.449a21.2 21.2 0 0 0 7.438-1.194c1.864-.727 2.525-1.535 2.525-2V9.7a10.4 10.4 0 0 1-2.084 1.076A22.3 22.3 0 0 1 16 12.078a22.4 22.4 0 0 1-7.879-1.3A10.3 10.3 0 0 1 6.037 9.7v3.55c0 .474.663 1.278 2.525 2.006m0 6.705a15.6 15.6 0 0 0 2.6.741a25 25 0 0 0 4.838.453a25 25 0 0 0 4.838-.452a15.6 15.6 0 0 0 2.6-.741c1.864-.727 2.525-1.535 2.525-2v-3.39a10.7 10.7 0 0 1-1.692.825A23.5 23.5 0 0 1 16 18.74a23.5 23.5 0 0 1-8.271-1.348a11 11 0 0 1-1.692-.825v3.393c0 .466.663 1.271 2.525 2.001M16 30c5.5 0 9.963-1.744 9.963-3.894v-2.837a10.5 10.5 0 0 1-1.535.762l-.157.063A23.5 23.5 0 0 1 16 25.445a23.4 23.4 0 0 1-8.271-1.351l-.157-.063a10.5 10.5 0 0 1-1.535-.762v2.837C6.037 28.256 10.5 30 16 30"/><ellipse cx="16" cy="5.894" fill="#c4c7ce" rx="9.963" ry="3.894"/></svg>', // db
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2m0 12h-4v-2h-2v2H4V8h10v2h2V8h4zm-4-6v-2h2v2zm-2 0h2v2h-2zm4 4h-2v-2h2z"/></svg>', // zip
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M19 19H5V5h14m0-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-5.04 9.29l-2.75 3.54l-1.96-2.36L6.5 17h11z"/></svg>', // image
  ]
  return (
    <IconCloudComponent images={iconNames} />
  )
}

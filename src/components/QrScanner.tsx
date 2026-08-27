import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'

interface QrScannerProps {
  onScan: (decodedText: string) => void
}

export function QrScanner({ onScan }: QrScannerProps) {
  const elementId = useId().replace(/[:]/g, '')
  const onScanRef = useRef(onScan)
  const [cameraError, setCameraError] = useState<string | null>(null)

  onScanRef.current = onScan

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId)
    let stopped = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (stopped) return
          stopped = true
          onScanRef.current(decodedText)
        },
        () => {
          // brak kodu QR w bieżącej klatce - ignorujemy
        },
      )
      .catch((err) => {
        if (stopped) return
        setCameraError('Brak dostepu do kamery. Sprawdz uprawnienia przegladarki.')
        console.error(err)
      })

    return () => {
      stopped = true
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        scanner.stop().then(() => scanner.clear()).catch(() => {})
      } else {
        scanner.clear()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId])

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div id={elementId} className="w-full max-w-sm overflow-hidden rounded-xl bg-black" />
      {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
    </div>
  )
}

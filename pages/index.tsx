import { createQR, encodeURL, TransactionRequestURLFields } from "@solana/pay"
import { useEffect, useRef } from "react"

export default function Home() {
  const mintQrRef = useRef<HTMLDivElement>()

  useEffect(() => {
    const { location } = window
    const apiUrl = `${location.protocol}//${location.host}/api/`

    const mintUrlFields: TransactionRequestURLFields = {
      link: new URL(apiUrl + 'checkout'),
    }
    const mintUrl = encodeURL(mintUrlFields)
    const mintQr = createQR(mintUrl, 400, 'transparent')
    console.log('mintQr', mintUrl.toString())

    if (mintQrRef.current) {
      mintQrRef.current.innerHTML = ''
      mintQr.append(mintQrRef.current)
    }
  }, [])

  return (
    <main className="container flex items-center p-4 mx-auto min-h-screen justify-center">
      <div className="flex flex-col gap-8">
        <h1 className="text-xl">Or scan QR code</h1>
        <div ref={mintQrRef} />
      </div>
    </main>
  )
}

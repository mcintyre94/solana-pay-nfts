import { createQR, encodeURL, TransactionRequestURLFields } from "@solana/pay"
import Link from "next/link"
import { useEffect, useRef } from "react"
import Navbar from "../components/Navbar"

export default function Home() {
  const mintQrRef = useRef<HTMLDivElement>()

  useEffect(() => {
    const { location } = window
    const apiUrl = `${location.protocol}//${location.host}/api/`

    const mintUrlFields: TransactionRequestURLFields = {
      link: new URL(apiUrl + 'mint-gasless'),
    }
    const mintUrl = encodeURL(mintUrlFields)
    const mintQr = createQR(mintUrl, 400, 'transparent')

    if (mintQrRef.current) {
      mintQrRef.current.innerHTML = ''
      mintQr.append(mintQrRef.current)
    }
  }, [])

  return (
    <div className="container flex flex-col gap-20 items-center p-4 mx-auto min-h-screen justify-center">
      <Navbar />

      <main>
        <h1 className="font-mono text-xl code">Mint Gasless</h1>
        <div ref={mintQrRef} />
      </main>
    </div>
  )
}

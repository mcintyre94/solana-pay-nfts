import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex w-full h-10 gap-4 px-4 pt-4 pb-20 font-sans md:px-20 md:gap-10">
      <Link href="/mint">
        <a className="text-2xl no-underline">
          Mint
        </a>
      </Link>
      <Link href="/mint-gasless">
        <a className="text-2xl no-underline grow">
          Mint Gasless 😎
        </a>
      </Link>
    </nav>
  )
}
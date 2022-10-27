import { bundlrStorage, keypairIdentity, Metaplex, toMetaplexFile } from "@metaplex-foundation/js"
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js"
import base58 from "bs58"
import * as dotenv from "dotenv"
import * as fs from "fs"
dotenv.config()

async function main() {
  const payerPrivateKey = process.env.PAYER_PRIVATE_KEY
  if (!payerPrivateKey) throw new Error('PAYER_PRIVATE_KEY not found')
  const payerKeypair = Keypair.fromSecretKey(base58.decode(payerPrivateKey))

  const connection = new Connection(clusterApiUrl('devnet'))

  const nfts = Metaplex
    .make(connection, { cluster: 'devnet' })
    .use(keypairIdentity(payerKeypair))
    .use(bundlrStorage({
      address: "https://devnet.bundlr.network",
      providerUrl: "https://api.devnet.solana.com",
      timeout: 60000
    }))
    .nfts();

  const tokenPath = "nft-upload/golden-ticket.jpg"
  const tokenName = "golden-ticket.jpg"

  const imageBuffer = fs.readFileSync(tokenPath)
  const file = toMetaplexFile(imageBuffer, tokenName)

  const uploadedMetadata = await nfts.uploadMetadata({
    name: "Golden Ticket",
    symbol: "GOLD",
    description: "A golden ticket that grants access to loyalty rewards",
    image: file,
  })

  console.log(`Uploaded metadata: ${uploadedMetadata.uri}`)
}

main()
  .then(() => {
    console.log("Done!")
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

import { NextApiRequest, NextApiResponse } from "next"
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js"
import { getOrCreateAssociatedTokenAccount, createTransferCheckedInstruction, getMint } from "@solana/spl-token"
import { GuestIdentityDriver, keypairIdentity, Metaplex } from "@metaplex-foundation/js"
import base58 from 'bs58'

type MintInputData = {
  account: string,
}

type MintGetResponse = {
  label: string,
  icon: string,
}

type MintOutputData = {
  transaction: string,
  message: string,
}

type ErrorOutput = {
  error: string
}

function get(res: NextApiResponse<MintGetResponse>) {
  res.status(200).json({
    label: "Dinos 'R' Us 🦖",
    icon: "https://freesvg.org/img/DINO-01.png",
  })
}

async function postImpl(
  account: PublicKey,
  quantity: number,
): Promise<MintOutputData> {
  const connection = new Connection(clusterApiUrl('devnet'))

  const payerPrivateKey = process.env.PAYER_PRIVATE_KEY
  if (!payerPrivateKey) throw new Error('PAYER_PRIVATE_KEY not found')
  const payerKeypair = Keypair.fromSecretKey(base58.decode(payerPrivateKey))

  // Metaplex with account as guest identity
  const nfts = Metaplex
    .make(connection, { cluster: 'devnet' })
    .use(keypairIdentity(payerKeypair))
    .nfts()

  const metadataUri = "https://arweave.net/3F1tuBwA6Y3jonQZC-jgXe40KHcqrcrrygTFe2sVdbI"

  const transactionBuilders = []
  const mintKeypairs = []

  for(let i=0; i<quantity; i++) {
    const mintKeypair = Keypair.generate()
    const transactionBuilder = await nfts.builders().create({
      uri: metadataUri,
      name: 'Golden Ticket',
      updateAuthority: payerKeypair,
      tokenOwner: account,
      sellerFeeBasisPoints: 100,
      useNewMint: mintKeypair,
    })

    mintKeypairs.push(mintKeypair)
    transactionBuilders.push(transactionBuilder)
  }

  const transactionBuilder = transactionBuilders.reduce((b, nextB) => b.append(nextB))

  const USDC_ADDRESS = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr")
  const usdcMint = await getMint(connection, USDC_ADDRESS)

  const fromUsdcAddress = await getOrCreateAssociatedTokenAccount(
    connection,
    payerKeypair,
    USDC_ADDRESS,
    account,
  )

  const toUsdcAddress = await getOrCreateAssociatedTokenAccount(
    connection,
    payerKeypair,
    USDC_ADDRESS,
    payerKeypair.publicKey,
  )

  const decimals = usdcMint.decimals
  const priceEach = 1

  const usdcTransferInstruction = createTransferCheckedInstruction(
    fromUsdcAddress.address,
    USDC_ADDRESS,
    toUsdcAddress.address,
    account,
    priceEach * quantity * (10 ** decimals),
    decimals
  )

  const identitySigner = new GuestIdentityDriver(account)

  transactionBuilder.prepend({
    instruction: usdcTransferInstruction,
    signers: [identitySigner]
  })

  transactionBuilder.setFeePayer(payerKeypair)

  // Convert to transaction
  const latestBlockhash = await connection.getLatestBlockhash()
  const transaction = await transactionBuilder.toTransaction(latestBlockhash)

  // Sign as the mint signers
  transaction.sign(...mintKeypairs, payerKeypair)

  // Serialize the transaction and convert to base64 to return it
  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false
  })
  const base64 = serializedTransaction.toString('base64')

  const message = "Please approve the transaction to mint your golden ticket!"

  // Return the serialized transaction
  return {
    transaction: base64,
    message,
  }
}

async function post(
  req: NextApiRequest,
  res: NextApiResponse<MintOutputData | ErrorOutput>
) {
  const { account } = req.body as MintInputData
  if (!account) {
    res.status(400).json({ error: "No account provided" })
    return
  }

  const quantityQuery = req.query.quantity
  if(!quantityQuery || !(typeof quantityQuery === 'string')) {
    res.status(400).json({error: "quantity must be provided exactly once"})
    return
  }
  const quantity = Number(quantityQuery)

  try {
    const mintOutputData = await postImpl(new PublicKey(account), quantity);
    res.status(200).json(mintOutputData)
    return
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'error creating transaction' })
    return
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MintGetResponse | MintOutputData | ErrorOutput>
) {
  if (req.method === "GET") {
    return get(res)
  } else if (req.method === "POST") {
    return await post(req, res)
  } else {
    return res.status(405).json({ error: "Method not allowed" })
  }
}

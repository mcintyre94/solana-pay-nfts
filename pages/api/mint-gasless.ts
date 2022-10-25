import { NextApiRequest, NextApiResponse } from "next"
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js"
import { guestIdentity, keypairIdentity, KeypairSigner, Metaplex } from "@metaplex-foundation/js"
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
  account: PublicKey
): Promise<MintOutputData> {
  const connection = new Connection(clusterApiUrl('devnet'))
  const candyMachineAddress = new PublicKey("3vNpTMWAVLYo8XbKmcnH7BPQyjWc2eHfowuUuYvhCLja")

  const payerPrivateKey = process.env.PAYER_PRIVATE_KEY
  if (!payerPrivateKey) throw new Error('PAYER_PRIVATE_KEY not found')
  const payerKeypair = Keypair.fromSecretKey(base58.decode(payerPrivateKey))

  // Metaplex with account as guest identity
  const candyMachines = Metaplex
    .make(connection, { cluster: 'devnet' })
    .use(keypairIdentity(payerKeypair))
    .candyMachinesV2()

  const candyMachine = await candyMachines.findByAddress({ address: candyMachineAddress })

  // Transaction builder for mint
  const transactionBuilder = await candyMachines.builders().mint({
    candyMachine,
    newOwner: account,
  })
  transactionBuilder.setFeePayer(payerKeypair)

  // Extract mint signer
  const context = transactionBuilder.getContext()
  const mintSigner = context.mintSigner as KeypairSigner

  // Convert to transaction
  const latestBlockhash = await connection.getLatestBlockhash()
  const transaction = await transactionBuilder.toTransaction(latestBlockhash)

  // Add scanning user as a keypair
  transaction.instructions[0].keys.push({
    pubkey: account,
    isWritable: false,
    isSigner: true,
  })

  // Sign as the mint signer
  transaction.sign(mintSigner, payerKeypair)

  // Serialize the transaction and convert to base64 to return it
  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false
  })
  const base64 = serializedTransaction.toString('base64')

  const message = "Mint a DINO! 🦖"

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

  try {
    const mintOutputData = await postImpl(new PublicKey(account));
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

import { NextApiRequest, NextApiResponse } from "next"
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js"
import { guestIdentity, KeypairSigner, Metaplex } from "@metaplex-foundation/js"

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
    label: "Dinos 'r' Us 🦖",
    icon: "https://freesvg.org/img/DINO-01.png",
  })
}

async function postImpl(
  account: PublicKey
): Promise<MintOutputData> {
  const connection = new Connection(clusterApiUrl('devnet'))
  const candyMachineAddress = new PublicKey("7Sosk9YgpisDJo8hLWL3F1Dh2sW52KSLhhwez8vBYnpn")

  // Metaplex with account as guest identity
  const candyMachines = Metaplex
    .make(connection, { cluster: 'devnet' })
    .use(guestIdentity(account))
    .candyMachinesV2()

  const candyMachine = await candyMachines.findByAddress({ address: candyMachineAddress })

  // Transaction builder for mint
  const transactionBuilder = await candyMachines.builders().mint({ candyMachine })

  // Extract mint signer
  const context = transactionBuilder.getContext()
  const mintSigner = context.mintSigner as KeypairSigner

  // Convert to transaction
  const latestBlockhash = await connection.getLatestBlockhash()
  const transaction = await transactionBuilder.toTransaction(latestBlockhash)
  transaction.feePayer = account

  // Sign as the mint signer
  transaction.sign(mintSigner)

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

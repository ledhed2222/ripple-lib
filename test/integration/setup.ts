import { generateXAddress, Client, Wallet } from 'xrpl-local'

import serverUrl from './serverUrl'
import { fundAccount, ledgerAccept } from './utils'

export async function teardownClient(this: Mocha.Context): Promise<void> {
  this.client.disconnect()
}

export async function suiteClientSetup(this: Mocha.Context): Promise<void> {
  this.transactions = []

  await setupClient.bind(this)(serverUrl)
  await ledgerAccept(this.client)
  this.newWallet = generateXAddress({ includeClassicAddress: true })
  await teardownClient.bind(this)()
}

export async function setupClient(
  this: Mocha.Context,
  server = serverUrl,
): Promise<void> {
  this.wallet = Wallet.generate()
  return new Promise<void>((resolve, reject) => {
    this.client = new Client(server)
    this.client
      .connect()
      .then(async () => {
        await fundAccount(this.client, this.wallet)
        resolve()
      })
      .catch(reject)
  })
}

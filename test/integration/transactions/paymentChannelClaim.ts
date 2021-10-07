import _ from 'lodash'

import {
  PaymentChannelCreate,
  computePaymentChannelHash,
  PaymentChannelClaim,
} from 'xrpl-local'

import serverUrl from '../serverUrl'
import { setupClient, suiteClientSetup, teardownClient } from '../setup'
import { generateFundedWallet, testTransaction } from '../utils'

// how long before each test case times out
const TIMEOUT = 20000

describe('PaymentChannelClaim', function () {
  this.timeout(TIMEOUT)

  before(suiteClientSetup)
  beforeEach(_.partial(setupClient, serverUrl))
  afterEach(teardownClient)

  it('base', async function () {
    const wallet2 = await generateFundedWallet(this.client)
    const paymentChannelCreate: PaymentChannelCreate = {
      TransactionType: 'PaymentChannelCreate',
      Account: this.wallet.getClassicAddress(),
      Amount: '100',
      Destination: wallet2.getClassicAddress(),
      SettleDelay: 86400,
      PublicKey: this.wallet.publicKey,
    }

    const paymentChannelResponse = await this.client.submitTransaction(
      this.wallet,
      paymentChannelCreate,
    )

    await testTransaction(this.client, paymentChannelCreate, this.wallet)

    const paymentChannelClaim: PaymentChannelClaim = {
      Account: this.wallet.getClassicAddress(),
      TransactionType: 'PaymentChannelClaim',
      Channel: computePaymentChannelHash(
        this.wallet.getClassicAddress(),
        wallet2.getClassicAddress(),
        paymentChannelResponse.result.tx_json.Sequence ?? 0,
      ),
      Amount: '100',
    }

    await testTransaction(this.client, paymentChannelClaim, this.wallet)
  })
})

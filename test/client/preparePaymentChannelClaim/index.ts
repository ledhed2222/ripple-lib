import assert from 'assert-diff'
import requests from '../../fixtures/requests'
import responses from '../../fixtures/responses'
import {assertResultMatch, TestSuite} from '../../utils'
const instructionsWithMaxLedgerVersionOffset = {maxLedgerVersionOffset: 100}
const {preparePaymentChannelClaim: REQUEST_FIXTURES} = requests
const {preparePaymentChannelClaim: RESPONSE_FIXTURES} = responses

/**
 * Every test suite exports their tests in the default object.
 * - Check out the "TestSuite" type for documentation on the interface.
 * - Check out "test/client/index.ts" for more information about the test runner.
 */
export default <TestSuite>{
  'default': async (client, address) => {
    const localInstructions = {
      ...instructionsWithMaxLedgerVersionOffset,
      maxFee: '0.000012'
    }
    const response = await client.preparePaymentChannelClaim(
      address,
      REQUEST_FIXTURES.normal,
      localInstructions
    )
    assertResultMatch(response, RESPONSE_FIXTURES.normal, 'prepare')
  },

  'with renew': async (client, address) => {
    const localInstructions = {
      ...instructionsWithMaxLedgerVersionOffset,
      maxFee: '0.000012'
    }
    const response = await client.preparePaymentChannelClaim(
      address,
      REQUEST_FIXTURES.renew,
      localInstructions
    )
    assertResultMatch(response, RESPONSE_FIXTURES.renew, 'prepare')
  },

  'with close': async (client, address) => {
    const localInstructions = {
      ...instructionsWithMaxLedgerVersionOffset,
      maxFee: '0.000012'
    }
    const response = await client.preparePaymentChannelClaim(
      address,
      REQUEST_FIXTURES.close,
      localInstructions
    )
    assertResultMatch(response, RESPONSE_FIXTURES.close, 'prepare')
  },

  'with ticket': async (client, address) => {
    const localInstructions = {
      ...instructionsWithMaxLedgerVersionOffset,
      maxFee: '0.000012',
      ticketSequence: 23
    }
    const response = await client.preparePaymentChannelClaim(
      address,
      REQUEST_FIXTURES.normal,
      localInstructions
    )
    assertResultMatch(response, RESPONSE_FIXTURES.ticket, 'prepare')
  },

  'rejects Promise on preparePaymentChannelClaim with renew and close': async (
    client,
    address
  ) => {
    try {
      const prepared = await client.preparePaymentChannelClaim(
        address,
        REQUEST_FIXTURES.full
      )
      throw new Error(
        'Expected method to reject. Prepared transaction: ' +
          JSON.stringify(prepared)
      )
    } catch (err) {
      assert.strictEqual(err.name, 'ValidationError')
      assert.strictEqual(
        err.message,
        '"renew" and "close" flags on PaymentChannelClaim are mutually exclusive'
      )
    }
  },

  'rejects Promise on preparePaymentChannelClaim with no signature': async (
    client,
    address
  ) => {
    try {
      const prepared = await client.preparePaymentChannelClaim(
        address,
        REQUEST_FIXTURES.noSignature
      )
      throw new Error(
        'Expected method to reject. Prepared transaction: ' +
          JSON.stringify(prepared)
      )
    } catch (err) {
      assert.strictEqual(err.name, 'ValidationError')
      assert.strictEqual(
        err.message,
        '"signature" and "publicKey" fields on PaymentChannelClaim must only be specified together.'
      )
    }
  }
}

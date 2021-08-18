import assert from 'assert-diff'
import requests from '../../fixtures/requests'
import responses from '../../fixtures/responses'
import {assertResultMatch, TestSuite} from '../../utils'
const instructionsWithMaxLedgerVersionOffset = {maxLedgerVersionOffset: 100}

/**
 * Every test suite exports their tests in the default object.
 * - Check out the "TestSuite" type for documentation on the interface.
 * - Check out "test/client/index.ts" for more information about the test runner.
 */
export default <TestSuite>{
  'simple test': async (client, address) => {
    const response = await client.prepareSettings(
      address,
      requests.prepareSettings.domain,
      instructionsWithMaxLedgerVersionOffset
    )
    assertResultMatch(response, responses.prepareSettings.flags, 'prepare')
  },
  'no maxLedgerVersion': async (client, address) => {
    const response = await client.prepareSettings(
      address,
      requests.prepareSettings.domain,
      {
        maxLedgerVersion: null
      }
    )
    assertResultMatch(
      response,
      responses.prepareSettings.noMaxLedgerVersion,
      'prepare'
    )
  },
  'no instructions': async (client, address) => {
    const response = await client.prepareSettings(
      address,
      requests.prepareSettings.domain
    )
    assertResultMatch(
      response,
      responses.prepareSettings.noInstructions,
      'prepare'
    )
  },
  'regularKey': async (client, address) => {
    const regularKey = {regularKey: 'rAR8rR8sUkBoCZFawhkWzY4Y5YoyuznwD'}
    const response = await client.prepareSettings(
      address,
      regularKey,
      instructionsWithMaxLedgerVersionOffset
    )
    assertResultMatch(response, responses.prepareSettings.regularKey, 'prepare')
  },
  'remove regularKey': async (client, address) => {
    const regularKey = {regularKey: null}
    const response = await client.prepareSettings(
      address,
      regularKey,
      instructionsWithMaxLedgerVersionOffset
    )
    assertResultMatch(
      response,
      responses.prepareSettings.removeRegularKey,
      'prepare'
    )
  },
  'flag set': async (client, address) => {
    const settings = {requireDestinationTag: true}
    const response = await client.prepareSettings(
      address,
      settings,
      instructionsWithMaxLedgerVersionOffset
    )
    assertResultMatch(response, responses.prepareSettings.flagSet, 'prepare')
  },
  'flag clear': async (client, address) => {
    const settings = {requireDestinationTag: false}
    const response = await client.prepareSettings(
      address,
      settings,
      instructionsWithMaxLedgerVersionOffset
    )
    assertResultMatch(response, responses.prepareSettings.flagClear, 'prepare')
  },
  'set depositAuth flag': async (client, address) => {
    const settings = {depositAuth: true}
    const response = await client.prepareSettings(
      address,
      settings,
      instructionsWithMaxLedgerVersionOffset
    )
    assertResultMatch(
      response,
      responses.prepareSettings.flagSetDepositAuth,
      'prepare'
    )
  },
  'clear depositAuth flag': async (client, address) => {
    const settings = {depositAuth: false}
    const response = await client.prepareSettings(
      address,
      settings,
      instructionsWithMaxLedgerVersionOffset
    )
    assertResultMatch(
      response,
      responses.prepareSettings.flagClearDepositAuth,
      'prepare'
    )
  },
  'integer field clear': async (client, address) => {
    const settings = {transferRate: null}
    const response = await client.prepareSettings(
      address,
      settings,
      instructionsWithMaxLedgerVersionOffset
    )
    assert(response)
    assert.strictEqual(JSON.parse(response.txJSON).TransferRate, 0)
  },
  'set transferRate': async (client, address) => {
    const settings = {transferRate: 1}
    const response = await client.prepareSettings(
      address,
      settings,
      instructionsWithMaxLedgerVersionOffset
    )
    assertResultMatch(
      response,
      responses.prepareSettings.setTransferRate,
      'prepare'
    )
  },
  'set signers': async (client, address) => {
    const settings = requests.prepareSettings.signers.normal
    const response = await client.prepareSettings(
      address,
      settings,
      instructionsWithMaxLedgerVersionOffset
    )
    assertResultMatch(response, responses.prepareSettings.signers, 'prepare')
  },
  'signers no threshold': async (client, address) => {
    const settings = requests.prepareSettings.signers.noThreshold
    try {
      const response = await client.prepareSettings(
        address,
        settings,
        instructionsWithMaxLedgerVersionOffset
      )
      throw new Error(
        'Expected method to reject. Prepared transaction: ' +
          JSON.stringify(response)
      )
    } catch (err) {
      assert.strictEqual(
        err.message,
        'instance.settings.signers requires property "threshold"'
      )
      assert.strictEqual(err.name, 'ValidationError')
    }
  },
  'signers no weights': async (client, address) => {
    const settings = requests.prepareSettings.signers.noWeights
    const localInstructions = {
      signersCount: 1,
      ...instructionsWithMaxLedgerVersionOffset
    }
    const response = await client.prepareSettings(
      address,
      settings,
      localInstructions
    )
    assertResultMatch(response, responses.prepareSettings.noWeights, 'prepare')
  },
  'fee for multisign': async (client, address) => {
    const localInstructions = {
      signersCount: 4,
      ...instructionsWithMaxLedgerVersionOffset
    }
    const response = await client.prepareSettings(
      address,
      requests.prepareSettings.domain,
      localInstructions
    )
    assertResultMatch(
      response,
      responses.prepareSettings.flagsMultisign,
      'prepare'
    )
  },
  'no signer list': async (client, address) => {
    const settings = requests.prepareSettings.noSignerEntries
    const localInstructions = {
      signersCount: 1,
      ...instructionsWithMaxLedgerVersionOffset
    }
    const response = await client.prepareSettings(
      address,
      settings,
      localInstructions
    )
    assertResultMatch(
      response,
      responses.prepareSettings.noSignerList,
      'prepare'
    )
  },
  'invalid': async (client, address) => {
    // domain must be a string
    const settings = Object.assign({}, requests.prepareSettings.domain, {
      domain: 123
    })
    const localInstructions = {
      signersCount: 4,
      ...instructionsWithMaxLedgerVersionOffset
    }

    try {
      const response = await client.prepareSettings(
        address,
        settings,
        localInstructions
      )
      throw new Error(
        'Expected method to reject. Prepared transaction: ' +
          JSON.stringify(response)
      )
    } catch (err) {
      assert.strictEqual(
        err.message,
        'instance.settings.domain is not of a type(s) string'
      )
      assert.strictEqual(err.name, 'ValidationError')
    }
  },
  'offline': async (client, address) => {
    const secret = 'shsWGZcmZz6YsWWmcnpfr6fLTdtFV'

    const settings = requests.prepareSettings.domain
    const instructions = {
      sequence: 23,
      maxLedgerVersion: 8820051,
      fee: '0.000012'
    }
    const result = await client.prepareSettings(address, settings, instructions)
    assertResultMatch(result, responses.prepareSettings.flags, 'prepare')
    assert.deepEqual(
      client.sign(result.txJSON, secret),
      responses.prepareSettings.signed
    )
  },
  'prepare settings with ticket': async (client, address) => {
    const instructions = {
      ticketSequence: 23,
      maxLedgerVersion: 8820051,
      fee: '0.000012'
    }
    const response = await client.prepareSettings(
      address,
      requests.prepareSettings.domain,
      instructions
    )
    assertResultMatch(response, responses.prepareSettings.ticket, 'prepare')
  }
}

import assert from 'assert-diff'
import {TestSuite} from '../../utils'
import addresses from '../../fixtures/addresses.json'

export default <TestSuite>{
  'returns true for valid address': async (client, address) => {
    assert(client.isValidAddress('rLczgQHxPhWtjkaQqn3Q6UM8AbRbbRvs5K'))
    assert(client.isValidAddress(addresses.ACCOUNT_X))
    assert(client.isValidAddress(addresses.ACCOUNT_T))
  },

  'returns false for invalid address': async (client, address) => {
    assert(!client.isValidAddress('foobar'))
    assert(!client.isValidAddress(addresses.ACCOUNT_X.slice(0, -1)))
    assert(!client.isValidAddress(addresses.ACCOUNT_T.slice(1)))
  }
}

import responses from '../../fixtures/responses'
import submitFailure from '../../fixtures/responses/submit-failure.json'
import {assertResultMatch, TestSuite} from '../../utils'

/**
 * Every test suite exports their tests in the default object.
 * - Check out the "TestSuite" type for documentation on the interface.
 * - Check out "test/client/index.ts" for more information about the test runner.
 */
export default <TestSuite>{
  'submit': async (client, address) => {
    const result = await client.request('submit', { tx_blob: responses.sign.normal.signedTransaction })
    assertResultMatch(result, responses.submit, 'submit')
  },

  'submit - failure': async (client, address) => {
    assertResultMatch(await client.request('submit', { tx_blob: 'BAD' }), submitFailure)
  }
}

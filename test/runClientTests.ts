/* eslint-disable mocha/no-setup-in-describe -- Necessary to programmatically generate tests */
import fs from 'fs'
import path from 'path'

import { Client } from 'xrpl-local'

/**
 * Client Test Runner.
 *
 * Throws errors when we detect the absence of tests.
 * Puts all the client methods under one "describe" umbrella.
 */

describe('Client', function () {
  // doesn't need a functional client, just needs to instantiate to get a list of public methods
  // (to determine what methods are missing from )

  const allPublicMethods = getAllPublicMethods(new Client('wss://'))

  const allTestSuites = loadTestSuites()

  // Report any missing tests.
  const allTestedMethods = new Set(
    allTestSuites.map((testsuite) => testsuite.name),
  )
  for (const methodName of allPublicMethods) {
    if (!allTestedMethods.has(methodName)) {
      // TODO: Once migration is complete, remove `.skip()` so that missing tests are reported as failures.
      // eslint-disable-next-line mocha/no-skipped-tests -- See above TODO
      it.skip(`${methodName} - no test suite found`, function () {
        throw new Error(
          `Test file not found! Create file "test/client/${methodName}.ts".`,
        )
      })
    }
  }
})

function getAllPublicMethods(client: Client): string[] {
  return Array.from(
    new Set([
      ...Object.getOwnPropertyNames(client),
      ...Object.getOwnPropertyNames(Client.prototype),
    ]),
    // removes private methods
  ).filter((key) => !key.startsWith('_'))
}

/**
 * When the test suite is loaded, we represent it with the following
 * data structure containing tests and metadata about the suite.
 * If no test suite exists, we return this object with `isMissing: true`
 * so that we can report it.
 */
interface LoadedTestSuite {
  name: string
  tests: Array<[string, () => void | PromiseLike<void>]>
}

function loadTestSuites(): LoadedTestSuite[] {
  // eslint-disable-next-line node/no-sync -- Necessary for file processing
  const allTests = fs.readdirSync(path.join(__dirname, 'client'), {
    encoding: 'utf8',
  })
  return allTests
    .map((filename) => {
      if (filename.startsWith('.DS_Store')) {
        return null
      }
      let methodName: string
      if (filename.endsWith('.ts')) {
        methodName = filename.slice(0, -3)
      } else {
        methodName = filename
      }
      // eslint-disable-next-line max-len -- Many errors to disable
      // eslint-disable-next-line @typescript-eslint/no-var-requires, node/global-require, global-require, @typescript-eslint/no-require-imports, import/no-dynamic-require -- Necessary for client tests
      const testSuite = require(path.join(__dirname, 'client', filename))
      return {
        name: methodName,
        config: testSuite.config || {},
        tests: Object.entries(testSuite.default || {}),
      } as LoadedTestSuite
    })
    .filter(Boolean) as LoadedTestSuite[]
}

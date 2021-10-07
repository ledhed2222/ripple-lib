import { ValidationError } from '../../errors'
import { SignerEntry } from '../common'

import { BaseTransaction, validateBaseTransaction } from './common'

export interface SignerListSet extends BaseTransaction {
  TransactionType: 'SignerListSet'
  SignerQuorum: number
  SignerEntries: SignerEntry[]
}

const MAX_SIGNERS = 8

/**
 * Verify the form and type of an SignerListSet at runtime.
 *
 * @param tx - An SignerListSet Transaction.
 * @throws When the SignerListSet is Malformed.
 */
export function validateSignerListSet(tx: Record<string, unknown>): void {
  validateBaseTransaction(tx)

  if (tx.SignerQuorum === undefined) {
    throw new ValidationError('SignerListSet: missing field SignerQuorum')
  }

  if (typeof tx.SignerQuorum !== 'number') {
    throw new ValidationError('SignerListSet: invalid SignerQuorum')
  }

  if (tx.SignerEntries === undefined) {
    throw new ValidationError('SignerListSet: missing field SignerEntries')
  }

  if (!Array.isArray(tx.SignerEntries)) {
    throw new ValidationError('SignerListSet: invalid SignerEntries')
  }

  if (tx.SignerEntries.length === 0) {
    throw new ValidationError(
      'SignerListSet: need atleast 1 member in SignerEntries',
    )
  }

  if (tx.SignerEntries.length > MAX_SIGNERS) {
    throw new ValidationError(
      'SignerListSet: maximum of 8 members allowed in SignerEntries',
    )
  }
}

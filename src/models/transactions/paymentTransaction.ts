import { ValidationError } from '../../common/errors'
import { Amount, Path } from '../common'
import { BaseTransaction, isIssuedCurrency, GlobalFlags, verifyBaseTransaction } from './common'

export enum PaymentTransactionFlagsEnum {
    tfNoDirectRipple = 0x00010000,
    tfPartialPayment = 0x00020000,
    tfLimitQuality = 0x00040000,
}

interface PaymentTransactionFlags extends GlobalFlags {
    tfNoDirectRipple?: boolean
    tfPartialPayment?: boolean
    tfLimitQuality?: boolean
}
export interface PaymentTransaction extends BaseTransaction {
    TransactionType: 'Payment'
    Amount: Amount
    Destination: string
    DestinationTag?: number
    InvoiceID?: string
    Paths?: Path[]
    SendMax?: Amount
    DeliverMin?: Amount
    Flags?: number | PaymentTransactionFlags
}

/**
 * @param {PaymentTransaction} tx A Payment Transaction.
 * @returns {void}
 * @throws {ValidationError} When the PaymentTransaction is malformed.
 */
export function verifyPaymentTransaction(tx: PaymentTransaction): void {
    verifyBaseTransaction(tx)
    
    if (tx.Amount === undefined) {
        throw new ValidationError('PaymentTransaction: missing field Amount')
    }
    
    if (typeof tx.Amount !== 'string' && !isIssuedCurrency(tx.Amount)) {
        throw new ValidationError('PaymentTransaction: invalid Amount')
    }
    
    if (tx.Destination === undefined) {
        throw new ValidationError('PaymentTransaction: missing field Destination')
    }

    if (typeof tx.Destination !== 'string' && !isIssuedCurrency(tx.Destination)) {
        throw new ValidationError('PaymentTransaction: invalid Destination')
    }

    if (tx.DestinationTag !== undefined && typeof tx.DestinationTag !== 'number') {
        throw new ValidationError('PaymentTransaction: invalid DestinationTag')
    }
    
    if (tx.InvoiceID !== undefined && typeof tx.InvoiceID !== 'string') {
        throw new ValidationError('PaymentTransaction: invalid InvoiceID')
    }
    
    if (tx.Paths !== undefined && !isPaths(tx.Paths)) {
        throw new ValidationError('PaymentTransaction: invalid Paths')
    }
    
    if (tx.SendMax !== undefined && typeof tx.SendMax !== 'string' && !isIssuedCurrency(tx.SendMax)) {
        throw new ValidationError('PaymentTransaction: invalid SendMax')
    }
    
    if (tx.DeliverMin !== undefined) {
        const isTfPartialPayment = typeof tx.Flags === 'number' ?
            isFlagEnabled(tx.Flags, PaymentTransactionFlagsEnum.tfPartialPayment) :
            tx.Flags?.tfPartialPayment ?? false

        if (!isTfPartialPayment) {
            throw new ValidationError('PaymentTransaction: tfPartialPayment flag required with DeliverMin')
        }

        if (typeof tx.DeliverMin !== 'string' && !isIssuedCurrency(tx.DeliverMin)) {
            throw new ValidationError('PaymentTransaction: invalid DeliverMin')
        }
    }
}

function isPaths(paths: Path[]): boolean {
    if (!Array.isArray(paths) || paths.length === 0) {
        return false
    }
    
    for (const i in paths) {
        const path = paths[i]
        if (!Array.isArray(path) || path.length === 0) {
            return false
        }
        
        for (const j in path) {
            const pathStep = path[j]
            const { account, currency, issuer } = pathStep
            if (
                (account !== undefined && typeof account !== 'string') ||
                (currency !== undefined && typeof currency !== 'string') ||
                (issuer !== undefined && typeof issuer !== 'string')
            ) {
                return false
            }
        }
    }

    return true;
}

function isFlagEnabled(Flags: number, checkFlag: number) {
    // Perform bitwise AND (&) to check if a flag is enabled within Flags (as a number)
    return (checkFlag & Flags) === checkFlag
}

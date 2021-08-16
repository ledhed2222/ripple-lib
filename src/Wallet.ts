import {fromSeed} from 'bip32'
import {mnemonicToSeedSync} from 'bip39'
import {decode, encodeForSigning} from 'ripple-binary-codec'
import {deriveKeypair, generateSeed, verify} from 'ripple-keypairs'
import ECDSA from './common/ecdsa'
import {SignedTransaction} from './common/types/objects'
import {signOffline} from './transaction/sign'
import {SignOptions} from './transaction/types'
import {ValidationError} from './common/errors'

/**
 * A utility for deriving a wallet composed of a keypair (publicKey/privateKey).
 * A wallet can be derived from either a seed, mnemnoic, or entropy (array of random numbers).
 * It provides functionality to sign/verify transactions offline.
 */
class Wallet {
  readonly publicKey: string
  readonly privateKey: string
  private static readonly defaultAlgorithm: ECDSA = ECDSA.ed25519
  private static readonly defaultDerivationPath: string = "m/44'/144'/0'/0/0"

  constructor(publicKey: string, privateKey: string) {
    this.publicKey = publicKey
    this.privateKey = privateKey
  }

  /**
   * Derives a wallet from a seed.
   * @param {string} seed A string used to generate a keypair (publicKey/privateKey) to derive a wallet.
   * @param {ECDSA} algorithm The digital signature algorithm to generate an address for.
   * @returns {Wallet} A Wallet derived from a seed.
   */
  static fromSeed(seed: string, algorithm: ECDSA = Wallet.defaultAlgorithm): Wallet {
    return Wallet.deriveWallet(seed, algorithm)
  }

  /**
   * Derives a wallet from a mnemonic.
   * @param {string} mnemonic A string consisting of words (whitespace delimited) used to derive a wallet.
   * @param {string} derivationPath The path to derive a keypair (publicKey/privateKey) from a seed (that was converted from a mnemonic).
   * @returns {Wallet} A Wallet derived from a mnemonic.
   */
  static fromMnemonic(
    mnemonic: string,
    derivationPath: string = Wallet.defaultDerivationPath
  ): Wallet {
    const seed = mnemonicToSeedSync(mnemonic)
    const masterNode = fromSeed(seed)
    const node = masterNode.derivePath(derivationPath)
    if (node.privateKey === undefined) {
      throw new ValidationError('Unable to derive privateKey from mnemonic input')
    }

    const publicKey = Wallet.hexFromBuffer(node.publicKey)
    const privateKey = Wallet.hexFromBuffer(node.privateKey)
    return new Wallet(publicKey, `00${privateKey}`)
  }

  /**
   * Derives a wallet from an entropy (array of random numbers).
   * @param {Uint8Array | number[]} entropy An array of random numbers to generate a seed used to derive a wallet.
   * @param {ECDSA} algorithm The digital signature algorithm to generate an address for.
   * @returns {Wallet} A Wallet derived from an entropy.
   */
  static fromEntropy(
    entropy: Uint8Array | number[],
    algorithm: ECDSA = Wallet.defaultAlgorithm
  ): Wallet {
    const options = {
      entropy: Uint8Array.from(entropy),
      algorithm
    }
    const seed = generateSeed(options)
    return Wallet.deriveWallet(seed, algorithm)
  }

  private static hexFromBuffer(buffer: Buffer): string {
    return buffer.toString('hex').toUpperCase()
  }

  private static deriveWallet(seed: string, algorithm: ECDSA = Wallet.defaultAlgorithm): Wallet {
    const {publicKey, privateKey} = deriveKeypair(seed, {algorithm})
    return new Wallet(publicKey, privateKey)
  }

  /**
   * Signs a transaction offline.
   * @param {object} transaction A transaction to be signed offline.
   * @param {SignOptions} options Options to include for signing.
   * @returns {SignedTransaction} A signed transaction.
   */
  signTransaction(
    transaction: any, // TODO: transaction should be typed with Transaction type.
    options: SignOptions = {signAs: ''}
  ): SignedTransaction {
    return signOffline(this, JSON.stringify(transaction), options)
  }

  /**
   * Verifies a signed transaction offline.
   * @param {string} signedTransaction A signed transaction (hex string of signTransaction result) to be verified offline.
   * @returns {boolean} Returns true if a signedTransaction is valid.
   */
  verifyTransaction(signedTransaction: string): boolean {
    const tx = decode(signedTransaction)
    const messageHex: string = encodeForSigning(tx)
    const signature = tx.TxnSignature
    return verify(messageHex, signature, this.publicKey)
  }
}

export default Wallet

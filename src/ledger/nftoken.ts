import axios from 'axios'
import toml from 'toml'

import {RippleAPI} from '..'
import {ArgumentError, ValidationError} from '../common/errors'

const HTTP_TIMEOUT_MS = 3000
const DEFAULT_TAXON = 0
const MAX_ON_LEDGER_STORAGE_BYTES = 512
const DEFAULT_TRANSFER_FEE = 0

// token ID pieces
const TOKEN_ID_FLAG_LENGTH = 4
const TOKEN_ID_FEE_LENGTH = 4
const TOKEN_ID_ISSUER_LENGTH = 40
const TOKEN_ID_TAXON_LENGTH = 8
const TOKEN_ID_SEQUENCE_LENGTH = 8

export enum NFTokenStorageOption {
  OnLedger,
  CentralizedOffLedger,
}

export interface NFTokenParameters {
  issuingAccount: string,
  storageOption: NFTokenStorageOption,
  uri: string,
  transferFee?: number,
  flags?: number | [number],
  taxon?: number,
}

const uriToHex = (uri: string): string => (
  uri.split('').map((char) => (
    char.charCodeAt(0).toString(16).padStart(2, '0')
  )).join('').toUpperCase()
)

const validateOnLedger = (
  params: NFTokenParameters,
): void => {
  const { uri } = params

  // Confirm that data URI is <= the max recommended byte size
  if (uri.length > MAX_ON_LEDGER_STORAGE_BYTES) {
    throw new ValidationError(`${uri} is greater than ${MAX_ON_LEDGER_STORAGE_BYTES} bytes`)
  }

  // Confirm that URI is a correctly-encoded data URI
  if (!isDataUriValid(uri)) {
    throw new ValidationError(`${uri} is not a correctly-encoded data URI, as recommended`)
  }
}

const isDataUriValid = (uri: string): boolean => {
  const regex = /data:([-\w]+\/[-+\w.]+)?(;?\w+=[-\w]+)*(;base64)?,.*/gu
  return regex.test(uri)
}

const validateCentralizedOffLedger = async (
  params: NFTokenParameters
): Promise<void> => {
  const { uri, issuingAccount } = params

  // Confirm that `uri` is a valid URL
  let parsedUri
  try {
    parsedUri = new URL(uri)
  } catch (_err) {
    throw new ValidationError(`${uri} is not present or not a valid URL`)
  }

  // Confirm that `uri` exists
  try {
    await axios({
      method: 'head',
      responseType: 'text',
      timeout: HTTP_TIMEOUT_MS,
      url: uri,
    })
  } catch (_err) {
    throw new ValidationError(`${uri} does not return a 200-level HTTP response after redirects within ${HTTP_TIMEOUT_MS / 1000} seconds. Please ensure that ${uri} allows CORS`)
  }

  // Confirm that domain of `uri` contains an `xrp-ledger.toml` file
  let httpResponse
  // TODO allow checking against domain if given a subdomain
  const tomlUri = `https://${parsedUri.host}/.well-known/xrp-ledger.toml`
  try {
    httpResponse = await axios({
      method: 'get',
      responseType: 'text',
      timeout: HTTP_TIMEOUT_MS,
      url: tomlUri,
    })
  } catch (_err) {
    throw new ValidationError(`Could not HTTP GET the recommended xrp-ledger.toml file at ${tomlUri}`)
  }

  // Confirm that the `xrp-ledger.toml` file lists the `issuingAccount` as an
  // associated account
  let parsedToml
  try {
    parsedToml = toml.parse(httpResponse.data)
  } catch (_err) {
    throw new ValidationError(`The xrp-ledger.toml file at ${tomlUri} is malformed or doesn't exist`)
  }

  if (!parsedToml.ACCOUNTS) {
    throw new ValidationError(`The xrp-ledger.toml file at ${tomlUri} doesn't contain an ACCOUNTS section`)
  }
  if (!parsedToml.ACCOUNTS.find((entry) => entry.address === issuingAccount)) {
    throw new ValidationError(`The xrp-ledger.toml file at ${tomlUri} doesn't contain issuing account ${issuingAccount} in the ACCOUNTS section as recommended`)
  }
}

export const validateNFToken = async (
  params: NFTokenParameters,
): Promise<void> => {
  const { storageOption } = params
  switch (storageOption) {
    case NFTokenStorageOption.OnLedger:
      return validateOnLedger(params)
    case NFTokenStorageOption.CentralizedOffLedger:
      return await validateCentralizedOffLedger(params)
    default:
      throw new ArgumentError(`Unrecognized storage option ${storageOption}`)
  }
}

export const isNFTokenValid = async (
  params: NFTokenParameters,
): Promise<boolean> => {
  try {
    await validateNFToken(params)
  } catch (_err) {
    return false
  }
  return true
}

export interface CreateNFTokenParameters extends NFTokenParameters {
  skipValidation?: boolean,
}

const getFlags = (flags?: number | [number]): number => {
  if (flags == null) {
    return 0
  }
  if (typeof flags === 'number') {
    return flags
  }
  return flags.reduce((accumulator, flag) => accumulator | flag, 0)
}

const getTokenId = (flags: number, transferFee: number, issuer: string, taxon: number, tokenSequence: number): string => {
  const issuerHex = Array.from(
    RippleAPI.decodeXAddress(
      RippleAPI.classicAddressToXAddress(
        issuer,
        false,
        false,
      ),
    ).accountId,
  ).map((byte) => byte.toString(16).padStart(2, '0')).join('')

  const scrambledTaxon = taxon ^ (multiplyUint32(384160001, tokenSequence) + 1)

  return [
    [flags, TOKEN_ID_FLAG_LENGTH],
    [transferFee, TOKEN_ID_FEE_LENGTH],
    [issuerHex, TOKEN_ID_ISSUER_LENGTH],
    [scrambledTaxon, TOKEN_ID_TAXON_LENGTH],
    [tokenSequence, TOKEN_ID_SEQUENCE_LENGTH],
  ].map(([value, padding]) => (
    value.toString(16).padStart(parseInt(padding.toString()), '0')
  )).join('').toUpperCase()
}

// Super hacky way to multiply 32-bit numbers in JS
// reference: https://stackoverflow.com/questions/6232939/is-there-a-way-to-correctly-multiply-two-32-bit-integers-in-javascript
function multiplyUint32(a: number, b: number): number {
  var ah = (a >> 16) & 0xffff, al = a & 0xffff
  var bh = (b >> 16) & 0xffff, bl = b & 0xffff
  var high = ((ah * bl) + (al * bh)) & 0xffff
  return ((high << 16)>>>0) + (al * bl)
}

export const createNFToken = async (
  client: RippleAPI,
  senderSecret: string,
  params: CreateNFTokenParameters,
): Promise<[string, Object]> => {
  // Validate prospective token
  if (params.skipValidation !== true) {
    await validateNFToken(params)
  }

  const flags = getFlags(params.flags)
  const transferFee = params.transferFee ?? DEFAULT_TRANSFER_FEE
  const issuer = params.issuingAccount
  const taxon = params.taxon ?? DEFAULT_TAXON

  // get account data
  // NOTE: we're getting the transaction sequence ourselves here because we
  // also need to get the token sequence. Doing it this way will avoid a
  // second call to 'account_info' from 'prepareTransaction'.
  const accountData = await client.request('account_info', {
    account: issuer,
    ledger_index: 'current',
  })
  const tokenSequence = accountData.account_data.MintedTokens || 0
  const txSequence = accountData.account_data.Sequence || 0 

  // Create tx
  const mintTx = {
    TransactionType: 'NFTokenMint',
    Account: issuer,
    TokenTaxon: taxon,
    Flags: flags,
    TransferFee: transferFee,
    URI: uriToHex(params.uri),
  }
  
  // Submit it
  // TODO: perhaps this function shouldn't actually submit for you, but rather
  // just return the populated tx for users to manipulate and later
  // sign/submit themselves
  const preparedTx = await client.prepareTransaction(mintTx, { sequence: txSequence })
  const signedTx = client.sign(preparedTx.txJSON, senderSecret)
  const response = await client.request('submit', {
      tx_blob: signedTx.signedTransaction,
  })

  return [
    getTokenId(
      flags,
      transferFee,
      issuer,
      taxon,
      tokenSequence,
    ),
    response,
  ]
}

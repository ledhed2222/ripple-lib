import parseFields from './parse/fields'
import {validate, constants, ensureClassicAddress} from '../common'
import {FormattedSettings} from '../common/types/objects'
import {AccountInfoResponse} from '../models/methods'
import {XrplClient} from '..'
import {Settings} from '../common/constants'

const AccountFlags = constants.AccountFlags

export type SettingsOptions = {
  ledgerVersion?: number | 'validated' | 'closed' | 'current'
}

export function parseAccountFlags(
  value: number,
  options: {excludeFalse?: boolean} = {}
): Settings {
  const settings = {}
  for (const flagName in AccountFlags) {
    if (value & AccountFlags[flagName]) {
      settings[flagName] = true
    } else {
      if (!options.excludeFalse) {
        settings[flagName] = false
      }
    }
  }
  return settings
}

function formatSettings(response: AccountInfoResponse) {
  const data = response.result.account_data
  const parsedFlags = parseAccountFlags(data.Flags, {excludeFalse: true})
  const parsedFields = parseFields(data)
  return Object.assign({}, parsedFlags, parsedFields)
}

export async function getSettings(
  this: XrplClient,
  address: string,
  options: SettingsOptions = {}
): Promise<FormattedSettings> {
  // 1. Validate
  validate.getSettings({address, options})

  // Only support retrieving settings without a tag,
  // since settings do not distinguish by tag.
  address = ensureClassicAddress(address)

  // 2. Make Request
  const response = await this.request({command: 'account_info',
    account: address,
    ledger_index: options.ledgerVersion || 'validated',
    signer_lists: true
  })
  // 3. Return Formatted Response
  return formatSettings(response)
}

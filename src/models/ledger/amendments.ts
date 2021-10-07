import BaseLedgerEntry from './baseLedgerEntry'

interface Majority {
  Majority: {
    Amendment: string
    CloseTime: number
  }
}

export default interface Amendments extends BaseLedgerEntry {
  LedgerEntryType: 'Amendments'
  Amendments?: string[]
  Majorities?: Majority[]
  Flags: 0
}

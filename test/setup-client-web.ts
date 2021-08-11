import {XrplClient, XrplClientBroadcast} from 'ripple-client'
import ledgerClosed from './fixtures/rippled/ledger-close.json'

const port = 34371
const baseUrl = 'ws://testripple.circleci.com:'

function setup(this: any, port_ = port) {
  const tclient = new XrplClient({server: baseUrl + port_})
  return tclient
    .connect()
    .then(() => {
      return tclient.connection.request({
        command: 'test_command',
        data: {openOnOtherPort: true}
      })
    })
    .then((got) => {
      return new Promise<void>((resolve, reject) => {
        this.client = new XrplClient({server: baseUrl + got.port})
        this.client
          .connect()
          .then(() => {
            this.client.once('ledger', () => resolve())
            this.client.connection._ws.emit(
              'message',
              JSON.stringify(ledgerClosed)
            )
          })
          .catch(reject)
      })
    })
    .then(() => {
      return tclient.disconnect()
    })
}

function setupBroadcast(this: any) {
  const servers = [port, port + 1].map((port_) => baseUrl + port_)
  this.client = new XrplClientBroadcast(servers)
  return new Promise<void>((resolve, reject) => {
    this.client
      .connect()
      .then(() => {
        this.client.once('ledger', () => resolve())
        this.client._clients[0].connection._ws.emit(
          'message',
          JSON.stringify(ledgerClosed)
        )
      })
      .catch(reject)
  })
}

function teardown(this: any) {
  if (this.client.isConnected()) {
    return this.client.disconnect()
  }
  return undefined
}

export default {
  setup: setup,
  teardown: teardown,
  setupBroadcast: setupBroadcast
}
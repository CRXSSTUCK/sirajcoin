let secp256k1 = require('secp256k1')

module.exports = function (opts) {
  let {
    foundersAddress,
    treasuryPercent,
    foundersPercent
  } = opts

  // convert pubkey from hex string to Buffer
  let oraclePubkey = Buffer.from(opts.oraclePubkey, 'hex')

  // verifies new coins that were generated by a community growth grant
  // only the holder of the pubkey can grant coins
  return {
    initialState: {
      grantIds: {}
    },
    onInput (input, tx, state) {
      // verify that the tx was signed by the oracle
      if (!secp256k1.verify(tx.sigHash, input.signature, oraclePubkey)) {
        throw Error('Invalid signature')
      }

      // first output pays grant to community member,
      // can be any amount and any address
      let grantAmount = tx.outputs[0].amount

      // second output must pay a percentage of grant to community treasury
      let treasuryPayout = tx.outputs[1]
      let expectedTreasuryAmount = Math.floor(grantAmount * treasuryPercent / 100)
      if (treasuryPayout.amount !== expectedTreasuryAmount) {
        throw Error(`Oracle must pay ${treasuryPercent}% of grant amount to treasury`)
      }
      // we pay into a special account called "treasury", where money can only be
      // taken from via community votes. this functionality is not written yet,
      // so until then the money will just sit in the account
      if (treasuryPayout.address !== 'treasury') {
        throw Error('Treasury payout has wrong address')
      }

      // third output must pay a percentage of grant to founders
      let foundersPayout = tx.outputs[2]
      let expectedFoundersAmount = Math.floor(grantAmount * foundersPercent / 100)
      if (foundersPayout.amount !== expectedFoundersAmount) {
        throw Error(`Oracle must pay ${foundersPercent}% of grant amount to founders`)
      }
      if (foundersPayout.address !== foundersAddress) {
        throw Error('Founders payout has wrong address')
      }

      // grant txs should only have one input
      if (tx.inputs.length !== 1) {
        throw Error('Grant transactions must have exactly 1 input')
      }

      // can only have one grant with this ID
      if (state.grantIds[input.id]) {
        throw Error('Grant already claimed with this ID')
      }
      state.grantIds[input.id] = true
    }
  }
}

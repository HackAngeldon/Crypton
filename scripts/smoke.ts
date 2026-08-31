/* Node smoke test for the Crypton mock backend. Run with: npm test */
/* eslint-disable no-console */

const store = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size
  },
}

const { api, getDb, resetDb, priceNow, swapPreview } = await import('../src/lib/mockApi')

let pass = 0
let fail = 0
function ok(cond: boolean, msg: string) {
  if (cond) {
    pass++
    console.log(`  ✓ ${msg}`)
  } else {
    fail++
    console.error(`  ✗ FAIL: ${msg}`)
  }
}

resetDb()
await api.init()
const d = getDb()

console.log('seed')
ok(d.meta.seeded, 'db seeded')
ok(Object.keys(d.users).length === 2, `two users seeded (${Object.keys(d.users).length})`)
ok(!!d.wallets[d.meta.adminId], 'admin has a wallet')
const alex = Object.values(d.users).find((u) => u.email === 'alex@crypton.app')!
ok(alex.role === 'user', 'alex is a user')
const admin = Object.values(d.users).find((u) => u.email === 'admin@crypton.app')!
ok(admin.role === 'admin', 'admin exists')

console.log('auth')
let err = ''
try {
  await api.login('alex@crypton.app', '9999')
} catch (e) {
  err = (e as Error).message
}
ok(err.includes('Incorrect'), 'wrong PIN rejected')

const s = await api.login('alex@crypton.app', '1234')
ok(s.userId === alex.id && !s.locked, 'correct login works')
ok(alex.pinLen === 4, 'alex PIN length is 4')
ok(api.pinLengthFor('alex@crypton.app') === 4, 'pinLengthFor resolves 4-digit account')
ok(api.pinLengthFor('admin@crypton.app') === 6, 'pinLengthFor resolves 6-digit account')

await api.lock()
let locked = api.getSession()
ok(locked!.locked === true, 'lock sets locked flag')
await api.unlock('1234')
locked = api.getSession()
ok(locked!.locked === false, 'unlock clears flag')

console.log('send')
let wal = d.wallets[alex.id]
const btcBefore = wal.balances.bitcoin!
err = ''
try {
  await api.send({ userId: alex.id, asset: 'bitcoin', amount: 999, address: 'bc1q'.padEnd(20, 'a'), feeTier: 'standard' })
} catch (e) {
  err = (e as Error).message
}
ok(err.includes('Insufficient'), 'insufficient balance rejected')
wal = d.wallets[alex.id]
ok(wal.balances.bitcoin! === btcBefore, 'balance unchanged after failed send')

const sendTx = await api.send({ userId: alex.id, asset: 'bitcoin', amount: 0.01, address: 'bc1q' + 'x'.repeat(30), feeTier: 'standard' })
wal = d.wallets[alex.id]
const btcAfter = wal.balances.bitcoin!
ok(Math.abs(btcBefore - btcAfter - 0.01 - 0.01 * 0.0009) < 1e-9, 'send deducts amount + fee')
ok(sendTx.type === 'send' && sendTx.status === 'confirmed', 'send tx recorded')

console.log('buy')
const fiatBefore = wal.fiat
const ethBefore = wal.balances.ethereum ?? 0
await api.buy({ userId: alex.id, asset: 'ethereum', fiatAmount: 300 })
wal = d.wallets[alex.id]
ok(wal.fiat < fiatBefore, 'buy deducts fiat')
ok((wal.balances.ethereum ?? 0) > ethBefore, 'buy credits coin')
ok(wal.fiat >= 0, 'fiat never negative')

console.log('deposit + buy beyond fiat')
await api.depositFiat({ userId: alex.id, amount: 500 })
wal = d.wallets[alex.id]
ok(wal.fiat >= 300, 'top-up adds fiat')

console.log('swap')
const solBefore = wal.balances.solana!
const usdtBefore = wal.balances.tether ?? 0
const pv = swapPreview('solana', 'tether', 2)
ok(pv.received > 0 && pv.rate > 0, 'swap preview positive')
await api.swap({ userId: alex.id, from: 'solana', to: 'tether', amount: 2 })
wal = d.wallets[alex.id]
ok(wal.balances.solana! === solBefore - 2, 'swap deducts source')
ok(Math.abs((wal.balances.tether ?? 0) - usdtBefore - pv.received) < 1e-9, 'swap credits dest at preview rate')
ok(api.listTxs(alex.id).filter((t) => t.type === 'swap_in' || t.type === 'swap_out').length >= 2, 'swap txs recorded')

console.log('frozen account')
await api.adminToggleFreeze(alex.id, true)
err = ''
try {
  await api.login('alex@crypton.app', '1234')
} catch (e) {
  err = (e as Error).message
}
ok(err.includes('frozen'), 'frozen user cannot log in')
await api.adminToggleFreeze(alex.id, false)

console.log('admin balance set')
await api.adminSetBalance({ userId: alex.id, asset: 'dogecoin', amount: 10000, note: 'Loyalty bonus' })
wal = d.wallets[alex.id]
ok(wal.balances.dogecoin === 10000, 'admin sets exact balance')
ok(api.listTxs(alex.id)[0].type === 'admin_credit', 'admin credit tx recorded')

console.log('price override')
await api.adminOverridePrice('bitcoin', 99999)
ok(getDb().meta.priceOverrides.bitcoin === 99999, 'price override persisted (feed applies it in-app)')
await api.adminOverridePrice('bitcoin', null)
ok(!getDb().meta.priceOverrides.bitcoin, 'price override cleared')

console.log('announcement')
await api.adminAnnounce('Testing maintenance window', 'warning')
ok(api.announcements().length === 1, 'announcement broadcast')

console.log('register new user')
const reg = await api.register('New Person', 'new@person.io', '777777')
ok(!!reg.session.userId, 'register returns session')
const nw = d.wallets[reg.session.userId]
ok(nw.balances.tether === 25 && nw.balances['usd-coin'] === 25, 'new user gets welcome bonus')

err = ''
try {
  await api.register('New Person', 'new@person.io', '111111')
} catch (e) {
  err = (e as Error).message
}
ok(err.includes('already exists'), 'duplicate email rejected')

console.log('change pin')
await api.changePin('777777', '888888')
err = ''
try {
  await api.unlock('777777')
} catch (e) {
  err = (e as Error).message
}
ok(err.includes('Incorrect'), 'old pin rejected after change')
const s2 = await api.login('new@person.io', '888888')
ok(!!s2.userId, 'new pin works')

console.log('reset')
resetDb()
const d2 = getDb()
ok(d2.meta.seeded && Object.keys(d2.users).length === 2, 'reset reseeds demo data')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

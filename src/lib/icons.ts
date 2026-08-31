import type { CoinId } from '@/types'
import { COIN_MAP } from '@/data/coins'

/** Native-chain icon directories in the official trustwallet/assets repo. */
const NATIVE: Partial<Record<CoinId, string>> = {
  bitcoin: 'bitcoin',
  ethereum: 'ethereum',
  solana: 'solana',
  binancecoin: 'smartchain',
  cardano: 'cardano',
  xrp: 'xrp',
  dogecoin: 'dogecoin',
  polkadot: 'polkadot',
  'avalanche-2': 'avalanchec',
  litecoin: 'litecoin',
  near: 'near',
  'polygon-ecosystem-token': 'polygon',
}

/** ERC-20 token contract addresses (checksummed) for the trustwallet/assets repo. */
const ERC20: Partial<Record<CoinId, string>> = {
  tether: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  'usd-coin': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainlink: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  'shiba-inu': '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
}

const BASE = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/'

export function coinIconUrl(id: CoinId): string {
  const meta = COIN_MAP[id]
  if (!meta) return ''
  if (meta.chain === 'Ethereum' && ERC20[id]) return `${BASE}ethereum/assets/${ERC20[id]}/logo.png`
  const dir = NATIVE[id]
  return dir ? `${BASE}${dir}/info/logo.png` : ''
}

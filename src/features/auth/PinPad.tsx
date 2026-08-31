import { useEffect, useState } from 'react'
import { Delete } from 'lucide-react'

export function PinPad({
  onDigit,
  onDelete,
}: {
  onDigit: (d: string) => void
  onDelete: () => void
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  return (
    <div className="mx-auto grid w-full max-w-[260px] grid-cols-3 gap-3">
      {keys.map((k) => (
        <PinKey key={k} label={k} onPress={() => onDigit(k)} />
      ))}
      <div />
      <PinKey label="0" onPress={() => onDigit('0')} />
      <PinKey icon={<Delete size={20} />} onPress={onDelete} />
    </div>
  )
}

function PinKey({ label, onPress, icon }: { label?: string; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onPress}
      className="press flex h-14 items-center justify-center rounded-2xl border border-hairlinestrong bg-fill/5 text-xl font-semibold text-content active:bg-fill/10"
    >
      {icon ?? label}
    </button>
  )
}

export function usePinGate(onSubmit: (pin: string) => void, length = 6) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (pin.length === length) {
      const t = setTimeout(() => onSubmit(pin), 160)
      return () => clearTimeout(t)
    }
  }, [pin, length, onSubmit])

  const digit = (d: string) => {
    setError(false)
    setPin((p) => (p.length < length ? p + d : p))
  }
  const del = () => setPin((p) => p.slice(0, -1))
  const clear = () => {
    setPin('')
    setError(false)
  }
  const fail = () => {
    setError(true)
    setPin('')
  }

  return { pin, error, digit, del, clear, fail, setPin }
}

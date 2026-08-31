import { LogoMark, Wordmark } from '@/components/ui/Logo'

export function Splash() {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col items-center justify-center bg-canvas">
      <LogoMark size={72} />
      <Wordmark size={30} className="mt-6" />
      <p className="mt-2 text-sm text-content-faint">Your money, at the speed of light</p>
      <div className="mt-10 h-1 w-24 overflow-hidden rounded-full bg-fill/10">
        <div className="h-full w-1/2 animate-shimmer rounded-full bg-brand/70" style={{ backgroundSize: '200% 100%' }} />
      </div>
    </div>
  )
}

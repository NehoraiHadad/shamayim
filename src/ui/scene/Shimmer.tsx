const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Heat shimmer for the far ridge: turbulence displaces its edge by `amplitude` px and
 * slowly changes, so the crest trembles in real heat. Under reduced motion it holds still.
 */
export function Shimmer({ id, amplitude }: { id: string; amplitude: number }) {
  return (
    <defs>
      <filter id={id} x="-2%" y="-20%" width="104%" height="140%">
        <feTurbulence type="turbulence" baseFrequency="0.02 0.16" numOctaves="1" seed="3" result="t">
          {!reducedMotion() && (
            <animate attributeName="baseFrequency" dur="2.6s" repeatCount="indefinite" values="0.02 0.16;0.024 0.19;0.02 0.16" />
          )}
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="t" scale={amplitude * 2.4} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  )
}

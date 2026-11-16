/** Data attribution (required by the Open-Meteo and CAMS licences). */
export function Attribution({ withAir }: { withAir: boolean }) {
  return (
    <footer className="attribution">
      נתונים:{' '}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
      {' · '}DWD ICON{withAir ? ' · CAMS' : ''}
      <br />
      הימים השישי והשביעי הם מגמה ממודל גלובלי, פחות ודאיות.
    </footer>
  )
}

/** Data attribution (required by the Open-Meteo and CAMS licences) and how the forecast is made. */
export function Attribution({ withAir }: { withAir: boolean }) {
  return (
    <footer className="attribution">
      נתונים:{' '}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
      {' · '}DWD ICON · ECMWF{withAir ? ' · CAMS' : ''}
      <br />
      התחזית משלבת שני מודלים; כשהם חלוקים היום מסומן "לא ודאי".
      <br />
      הימים השישי והשביעי הם מגמה, פחות ודאיים.
    </footer>
  )
}

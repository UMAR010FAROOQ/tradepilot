const NEW_YORK_TIME = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export const FOREX_SESSION_NOTE = 'Session status excludes market holidays.'

export function getForexSessionStatus(date = new Date()) {
  const parts = Object.fromEntries(
    NEW_YORK_TIME.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  const beforeSundayOpen = parts.weekday === 'Sun' && minutes < 17 * 60
  const afterFridayClose = parts.weekday === 'Fri' && minutes >= 17 * 60
  const weekend = parts.weekday === 'Sat' || beforeSundayOpen || afterFridayClose

  return {
    isOpen: !weekend,
    status: weekend ? 'Weekend' : 'Open',
    displayStatus: weekend ? 'Closed' : 'Open',
    note: FOREX_SESSION_NOTE,
  }
}

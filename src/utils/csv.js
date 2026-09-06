export function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function serializeCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n')
}

export function downloadCsv(filename, headers, rows) {
  const blob = new Blob([`\uFEFF${serializeCsv(headers, rows)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

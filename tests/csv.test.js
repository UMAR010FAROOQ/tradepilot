import { describe, expect, it } from 'vitest'
import { escapeCsv, serializeCsv } from '../src/utils/csv.js'

describe('CSV serialization', () => {
  it.each([['plain', 'plain'], ['a,b', '"a,b"'], ['a"b', '"a""b"'], ['a\nb', '"a\nb"'], [null, ''], [undefined, '']])('escapes %j safely', (input, expected) => expect(escapeCsv(input)).toBe(expected))
  it('serializes CRLF rows', () => expect(serializeCsv(['Name', 'Status'], [['A, B', 'active']])).toBe('Name,Status\r\n"A, B",active'))
  it('does not invent excluded identity fields', () => { const output = serializeCsv(['Symbol', 'Side'], [['BTCUSDT', 'BUY']]); expect(output).not.toMatch(/userId|email/i) })
})

import { useEffect, useState } from 'react'
import { Download, NotebookPen, Trash2 } from 'lucide-react'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import JournalEditor from '../components/trading/JournalEditor.jsx'
import useAuth from '../hooks/useAuth.js'
import { deleteJournalEntry, subscribeToJournal } from '../services/journalService.js'
import { downloadCsv } from '../utils/csv.js'

const date = (value) => value?.toDate?.().toLocaleString() || '—'
const iso = (value) => value?.toDate?.().toISOString() || ''
function Journal() {
  const { currentUser } = useAuth(); const [entries, setEntries] = useState([]), [error, setError] = useState('')
  useEffect(() => subscribeToJournal(currentUser.uid, setEntries, () => setError('Trading journal is unavailable.')), [currentUser.uid])
  const exportJournal = () => downloadCsv(`tradepilot-journal-${new Date().toISOString().slice(0, 10)}.csv`, ['Journal ID', 'Trade ID', 'Symbol', 'Title', 'Tags', 'Rating', 'Notes', 'Created At', 'Updated At'], entries.map((item) => [item.id, item.tradeId, item.symbol, item.title, item.tags.join('; '), item.rating ?? '', item.notes, iso(item.createdAt), iso(item.updatedAt)]))
  return <div className="space-y-6"><PageHeader actions={<Button disabled={!entries.length} onClick={exportJournal} variant="secondary"><Download className="size-4" />Export Journal CSV</Button>} description="Personal notes linked to immutable simulated trade records." eyebrow="Trading workflow" title="Trading Journal" />{error && <p className="rounded-lg bg-negative/10 p-3 text-sm text-negative">{error}</p>}{entries.length ? <div className="grid gap-4 lg:grid-cols-2">{entries.map((entry) => <Card key={entry.id}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-accent">{entry.symbol}</p><h2 className="mt-1 text-base font-semibold">{entry.title}</h2><p className="mt-1 text-[10px] text-muted">Trade {entry.tradeId}</p></div><div className="flex gap-2"><JournalEditor label="Edit" trade={{ id: entry.tradeId, symbol: entry.symbol }} userId={currentUser.uid} /><Button aria-label="Delete journal entry" onClick={() => deleteJournalEntry(entry.id).catch(() => setError('Entry could not be deleted.'))} size="sm" variant="ghost"><Trash2 className="size-4" /></Button></div></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">{entry.notes || 'No notes.'}</p><div className="mt-4 flex flex-wrap gap-2">{entry.tags.map((tag) => <span className="rounded-full bg-elevated px-2.5 py-1 text-[10px]" key={tag}>{tag}</span>)}</div><div className="mt-4 flex justify-between border-t border-border pt-3 text-[10px] text-muted"><span>Review rating: {entry.rating || 'Not rated'}</span><span>Updated {date(entry.updatedAt)}</span></div></Card>)}</div> : <Card><div className="grid min-h-64 place-items-center text-center"><div><NotebookPen className="mx-auto size-8 text-muted" /><h2 className="mt-3 text-sm font-semibold">No journal entries</h2><p className="mt-1 text-xs text-muted">Add a journal note from Recent Trades or transaction details.</p></div></div></Card>}</div>
}
export default Journal

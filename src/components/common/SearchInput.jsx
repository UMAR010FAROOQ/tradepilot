import { Search, X } from 'lucide-react'
import IconButton from './IconButton.jsx'
import { cn } from '../../utils/cn.js'

function SearchInput({ value, onChange, placeholder = 'Search', className, inputClassName, id, 'aria-label': ariaLabel = 'Search' }) {
  return <div className={cn('relative', className)}><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input aria-label={ariaLabel} className={cn('h-10 w-full rounded-lg border border-border bg-elevated pl-9 pr-11 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent [&::-webkit-search-cancel-button]:appearance-none', inputClassName)} id={id} onChange={onChange} placeholder={placeholder} type="search" value={value} />{value && <IconButton aria-label="Clear search" className="absolute right-1 top-1/2 -translate-y-1/2" icon={X} onClick={() => onChange({ target: { value: '' } })} size="sm" title="Clear search" />}</div>
}

export default SearchInput

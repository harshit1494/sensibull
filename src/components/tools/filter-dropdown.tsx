import { useEffect, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

/**
 * TIGERBULL's multi-select filter dropdown: search box, column-flowing checkbox grid,
 * Select All / Unselect All, and Cancel / Apply (changes only commit on Apply).
 */
export function FilterDropdown({ label, options, value, onApply, align = 'right' }: { label: string; options: string[]; value: string[]; onApply: (v: string[]) => void; align?: 'left' | 'right' }) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<string[]>(value);
	const [q, setQ] = useState('');
	useEffect(() => {
		if (open) { setDraft(value); setQ(''); }
	}, [open]); // eslint-disable-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (!open) return;
		const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		window.addEventListener('keydown', k);
		return () => window.removeEventListener('keydown', k);
	}, [open]);
	const shown = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
	const partial = value.length > 0 && value.length < options.length;
	return (
		<div className="msd">
			<button type="button" className="msd-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
				{label} {partial ? <em>{value.length}</em> : null} <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
			</button>
			{open ? (
				<>
					<button type="button" className="msd-back" aria-label="Close" onClick={() => setOpen(false)} />
					<div className={`msd-pop ${align}`} role="dialog" aria-label={`${label} filter`}>
						<div className="msd-head">
							<label className="msd-search"><Search size={16} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" /></label>
						</div>
						<div className="msd-grid">
							{shown.length ? shown.map((o) => (
								<label key={o}>
									<input type="checkbox" checked={draft.includes(o)} onChange={() => setDraft(draft.includes(o) ? draft.filter((x) => x !== o) : [...draft, o])} /> {o}
								</label>
							)) : <p className="msd-empty">No match for “{q}”</p>}
						</div>
						<div className="msd-foot">
							<button type="button" className="sb-link" disabled={draft.length === options.length} onClick={() => setDraft(options)}>Select All</button>
							<button type="button" className="sb-link" disabled={draft.length === 0} onClick={() => setDraft([])}>Unselect All</button>
							<button type="button" className="msd-cancel" onClick={() => setOpen(false)}>Cancel</button>
							<button type="button" className="msd-apply" onClick={() => { onApply(draft); setOpen(false); }}>Apply</button>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}

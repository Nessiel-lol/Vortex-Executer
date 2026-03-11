import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Play, Copy, Save, Key, BadgeCheck, Eye, Heart, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

function postToHost(payload: Record<string, unknown>) {
  if ((window as any).chrome?.webview?.postMessage) {
    (window as any).chrome.webview.postMessage(payload);
  }
}

interface CloudScript {
  id: string;
  title: string;
  image: string;
  views: number;
  likes: number;
  keySystem: boolean;
  rawScript: string;
  username: string;
  verified: boolean;
  game: string;
}

interface CloudPanelProps {
  visible: boolean;
  onClose: () => void;
  isAttached: boolean;
}

type FilterType = 'all' | 'nokey' | 'verified';

const VortexLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]">
    <path d="M12 22L21 5H15.5L12 13.5L8.5 5H3L12 22Z" fill="url(#Cloud-grad)" />
    <defs>
      <linearGradient id="Cloud-grad" x1="3" y1="5" x2="21" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#c084fc" />
      </linearGradient>
    </defs>
  </svg>
);

export function CloudPanel({ visible, onClose, isAttached }: CloudPanelProps) {
  const [scripts, setScripts] = useState<CloudScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [maxPages, setMaxPages] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchScripts = (q: string, p: number, f: FilterType, append = false) => {
    if (!append) setLoading(true);
    postToHost({
      action: 'searchCloud',
      q,
      page: p,
      orderBy: 'date',
      filter: f === 'all' ? '' : f,
    });
  };

  useEffect(() => {
    const onCloudScripts = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.error) {
        toast.error('Failed to load cloud scripts');
        setLoading(false);
        return;
      }
      if (detail.page > 1) {
        setScripts(prev => [...prev, ...(detail.scripts || [])]);
      } else {
        setScripts(detail.scripts || []);
      }
      setPage(detail.page || 1);
      setMaxPages(detail.maxPages || 1);
      setLoading(false);
      setHasSearched(true);
    };

    const onRawFetched = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const { title, content, intent, error } = detail;
      if (error) {
        toast.error(`Failed to fetch ${title}`);
        return;
      }
      if (intent === 'execute') {
        if (!isAttached) {
          toast.error('Please inject before executing scripts.');
          return;
        }
        postToHost({ action: 'execute', script: content });
        toast.success(`Executing ${title}`);
      } else if (intent === 'copy') {
        // navigator.clipboard requires HTTPS; use fallback for http://vortex.ui
        try {
          const ta = document.createElement('textarea');
          ta.value = content;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          toast.success(`Copied ${title} to clipboard`);
        } catch {
          toast.error('Failed to copy to clipboard');
        }
      } else if (intent === 'save') {
        const safeName = title.replace(/[^a-zA-Z0-9_\-. ]/g, '').trim() + '.lua';
        postToHost({ action: 'saveScript', fileName: safeName, content });
      }
    };

    window.addEventListener('cloudScripts', onCloudScripts);
    window.addEventListener('rawScriptFetched', onRawFetched);
    return () => {
      window.removeEventListener('cloudScripts', onCloudScripts);
      window.removeEventListener('rawScriptFetched', onRawFetched);
    };
  }, [isAttached]);

  // Fetch on open
  useEffect(() => {
    if (visible && !hasSearched) {
      fetchScripts('', 1, filter);
    }
  }, [visible]);

  // Debounced search
  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchScripts(query, 1, filter);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, filter]);

  const loadMore = () => {
    if (page < maxPages) {
      fetchScripts(query, page + 1, filter, true);
    }
  };

  const handleAction = (script: CloudScript, intent: 'execute' | 'copy' | 'save') => {
    postToHost({ action: 'fetchRawScript', url: script.rawScript, title: script.title, intent });
  };

  const filterChips: { label: string; value: FilterType; icon?: React.ReactNode }[] = [
    { label: 'All', value: 'all' },
    { label: 'No Key', value: 'nokey', icon: <Key size={12} /> },
    { label: 'Verified', value: 'verified', icon: <BadgeCheck size={12} /> },
  ];

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col bg-[#0c0c0e]/95 backdrop-blur-md transition-all duration-300 ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-4">
          <VortexLogo />
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
              VORTEX <span className="text-zinc-500 font-normal text-[11px] uppercase tracking-wider">Cloud Scripts</span>
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1 font-medium">Powered by Rscripts.net</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-zinc-800/40 hover:bg-zinc-700/40 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all border border-zinc-800/50"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search + Filters */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-zinc-800/40">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search scripts, games..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {filterChips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setFilter(chip.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                filter === chip.value
                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                  : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800/50 hover:text-zinc-300'
              }`}
            >
              {chip.icon}
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Script Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading && scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
            <span className="text-sm">Loading scripts...</span>
          </div>
        ) : scripts.length === 0 && hasSearched ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500">
            <Search size={32} className="text-zinc-700" />
            <span className="text-sm">No scripts found.</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {scripts.map((script, idx) => (
                <div
                  key={script.id + '-' + idx}
                  className="group bg-zinc-900/60 border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700/60 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 flex flex-col"
                  style={{ animationDelay: `${(idx % 16) * 30}ms` }}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                    {script.image ? (
                      <img
                        src={script.image}
                        alt={script.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke="currentColor" strokeWidth="1.5"/></svg>
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      {script.keySystem && (
                        <span className="flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                          <Key size={10} />
                          Key
                        </span>
                      )}
                      {script.verified && (
                        <span className="flex items-center gap-1 bg-indigo-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                          <BadgeCheck size={10} />
                          Verified
                        </span>
                      )}
                    </div>
                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleAction(script, 'execute')}
                        className="w-9 h-9 rounded-lg bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
                        title="Execute"
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      <button
                        onClick={() => handleAction(script, 'copy')}
                        className="w-9 h-9 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
                        title="Copy to clipboard"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleAction(script, 'save')}
                        className="w-9 h-9 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
                        title="Save to scripts"
                      >
                        <Save size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 flex-1 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-medium text-zinc-200 line-clamp-2 leading-snug">{script.title}</h3>
                    </div>
                    {script.game && (
                      <span className="text-[10px] text-indigo-400/70 truncate">{script.game}</span>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <span className="text-[10px] text-zinc-500 truncate">@{script.username}</span>
                      <div className="flex items-center gap-2.5 text-[10px] text-zinc-600 shrink-0">
                        <span className="flex items-center gap-0.5"><Eye size={10} />{script.views}</span>
                        <span className="flex items-center gap-0.5"><Heart size={10} />{script.likes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {page < maxPages && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 font-medium transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

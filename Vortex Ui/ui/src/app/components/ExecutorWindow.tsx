import React, { useState, useEffect, useRef } from 'react';
import { CloudPanel } from './CloudPanel';
import { 
  Play, Trash2, FolderOpen, Save, Plug, 
  Settings, Cloud, TerminalSquare,
  Search, X, FileCode2, Minus, Square,
  GripVertical, ChevronRight, ChevronLeft, Users
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-lua';

const VortexLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
    <path d="M12 22L21 5H15.5L12 13.5L8.5 5H3L12 22Z" fill="url(#Vortex-grad)" />
    <defs>
      <linearGradient id="Vortex-grad" x1="3" y1="5" x2="21" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#c084fc" />
      </linearGradient>
    </defs>
  </svg>
);

const DEFAULT_CODE = `-- New Script
print("Hello from Vortex!")
`;

function postToHost(payload: Record<string, unknown>) {
  if ((window as any).chrome?.webview?.postMessage) {
    (window as any).chrome.webview.postMessage(payload);
  }
}

interface Tab {
  id: string;
  name: string;
  content: string;
}

let tabCounter = 1;
function createTab(name?: string, content?: string): Tab {
  const id = `tab-${Date.now()}-${tabCounter++}`;
  return {
    id,
    name: name || 'untitled.lua',
    content: content ?? DEFAULT_CODE,
  };
}

export function ExecutorWindow() {
  const [tabs, setTabs] = useState<Tab[]>([createTab('main.lua')]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [isAttached, setIsAttached] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(true);
  const [hubScripts, setHubScripts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cloudOpen, setCloudOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveFileName, setSaveFileName] = useState('');

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const code = activeTab.content;

  const setCode = (newCode: string) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: newCode } : t));
  };

  // --- Tab operations ---

  const addTab = (name?: string, content?: string) => {
    const existing = tabs.find(t => t.name === name);
    if (existing) {
      setActiveTabId(existing.id);
      if (content !== undefined) {
        setTabs(prev => prev.map(t => t.id === existing.id ? { ...t, content } : t));
      }
      return;
    }
    const tab = createTab(name, content);
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length <= 1) {
      toast.info("Can't close the last tab.");
      return;
    }
    const idx = tabs.findIndex(t => t.id === tabId);
    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      const nextIdx = Math.min(idx, remaining.length - 1);
      setActiveTabId(remaining[nextIdx].id);
    }
  };

  // --- C# event listeners ---

  useEffect(() => {
    const onInjectResult = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      toast.dismiss();
      if (detail.success) {
        setIsAttached(true);
        toast.success(detail.message);
      } else {
        toast.error(detail.message);
      }
    };

    const onExecuteResult = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.success) {
        toast.success(detail.message);
      } else {
        toast.error(detail.message);
      }
    };

    const onScriptList = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setHubScripts(detail.scripts || []);
    };

    const onScriptLoaded = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      addTab(detail.name, detail.content);
      toast.success(`Loaded ${detail.name}`);
    };

    const onFileOpened = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      addTab(detail.name, detail.content);
      toast.success(`Opened ${detail.name}`);
    };

    const onScriptSaved = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.success) {
        toast.success(detail.message);
        postToHost({ action: 'listScripts' });
      } else {
        toast.error(detail.message);
      }
    };

    const onScriptDeleted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.success) {
        toast.success(detail.message);
      } else {
        toast.error(detail.message);
      }
    };

    window.addEventListener('injectResult', onInjectResult);
    window.addEventListener('executeResult', onExecuteResult);
    window.addEventListener('scriptList', onScriptList);
    window.addEventListener('scriptLoaded', onScriptLoaded);
    window.addEventListener('fileOpened', onFileOpened);
    window.addEventListener('scriptSaved', onScriptSaved);
    window.addEventListener('scriptDeleted', onScriptDeleted);

    return () => {
      window.removeEventListener('injectResult', onInjectResult);
      window.removeEventListener('executeResult', onExecuteResult);
      window.removeEventListener('scriptList', onScriptList);
      window.removeEventListener('scriptLoaded', onScriptLoaded);
      window.removeEventListener('fileOpened', onFileOpened);
      window.removeEventListener('scriptSaved', onScriptSaved);
      window.removeEventListener('scriptDeleted', onScriptDeleted);
    };
  }, [tabs]);

  // Load script list from C# on mount
  useEffect(() => {
    postToHost({ action: 'listScripts' });
  }, []);

  // --- Handlers ---

  const handleInject = () => {
    if (isAttached) {
      toast.info('Vortex is already attached to the process.');
      return;
    }
    toast.loading('Injecting into Roblox process...');
    postToHost({ action: 'inject' });
  };

  const handleExecute = () => {
    if (!isAttached) {
      toast.error('Please inject Vortex before executing scripts.');
      return;
    }
    if (!code.trim()) {
      toast.warning('Cannot execute empty script.');
      return;
    }
    postToHost({ action: 'execute', script: code });
  };

  const handleClear = () => {
    setCode('');
    toast.info('Editor cleared.');
  };

  const handleSave = () => {
    if (!code.trim()) {
      toast.warning('Nothing to save.');
      return;
    }
    const defaultName = activeTab.name.endsWith('.lua') ? activeTab.name : 'untitled.lua';
    setSaveFileName(defaultName);
    setSaveModalOpen(true);
  };

  const confirmSave = () => {
    if (!saveFileName.trim()) return;
    const finalName = saveFileName.endsWith('.lua') ? saveFileName : saveFileName + '.lua';
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, name: finalName } : t));
    postToHost({ action: 'saveScript', fileName: finalName, content: code });
    setSaveModalOpen(false);
  };

  const handleOpen = () => {
    postToHost({ action: 'openFile' });
  };

  const executeHubScript = (e: React.MouseEvent, scriptName: string) => {
    e.stopPropagation();
    if (!isAttached) {
      toast.error(`Please inject before executing ${scriptName}`);
      return;
    }
    postToHost({ action: 'loadAndExecute', fileName: scriptName });
  };

  const filteredScripts = hubScripts.filter(name =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-screen h-screen bg-[#111113] overflow-hidden font-sans text-zinc-300 relative select-none">
      
      {/* Titlebar — draggable via C# */}
      <div
        className="h-10 bg-[#18181b]/90 border-b border-zinc-800/80 flex items-center justify-between pl-4 pr-0 cursor-default select-none"
        onMouseDown={() => postToHost({ action: 'drag' })}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wider text-zinc-100 uppercase flex items-center gap-2">
            <VortexLogo />
            Vortex <span className="text-zinc-500 font-normal">Executor</span>
          </span>
        </div>
        
        <div className="flex items-center text-zinc-400 h-full" onMouseDown={(e) => e.stopPropagation()}>
          <button onClick={() => postToHost({ action: 'minimize' })} className="h-full px-4 hover:bg-zinc-800 transition-colors"><Minus size={16} /></button>
          <button onClick={() => postToHost({ action: 'maximize' })} className="h-full px-4 hover:bg-zinc-800 transition-colors"><Square size={12} /></button>
          <button onClick={() => postToHost({ action: 'close' })} className="h-full px-4 hover:bg-red-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800/80">
          {/* Tab Bar */}
          <div className="h-10 bg-[#131315] border-b border-zinc-800/80 flex items-center px-2 overflow-x-auto gap-1 hide-scrollbar">
            {tabs.map((tab) => (
              <div 
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-mono cursor-pointer transition-colors ${
                  activeTabId === tab.id 
                    ? 'bg-[#1e1e20] text-zinc-200 border border-zinc-700/50' 
                    : 'text-zinc-500 hover:bg-[#1e1e20]/50 hover:text-zinc-300 border border-transparent'
                }`}
              >
                <FileCode2 size={14} className={activeTabId === tab.id ? "text-indigo-400" : "text-zinc-600"} />
                {tab.name}
                <button 
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="ml-2 opacity-50 hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => addTab()}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-[#1e1e20] rounded-md transition-colors ml-1"
            >
              <div className="w-4 h-4 flex items-center justify-center font-bold text-lg leading-none">+</div>
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden flex">
            <style>{`
              .token.comment, .token.prolog { color: #6A9955; }
              .token.string { color: #ce9178; }
              .token.number { color: #b5cea8; }
              .token.keyword, .token.builtin { color: #c586c0; }
              .token.boolean { color: #569cd6; }
              .token.operator, .token.entity, .token.url, .token.variable { color: #9cdcfe; }
              .token.punctuation { color: #d4d4d4; }
              .token.function { color: #dcdcaa; }
              .token.class-name { color: #4ec9b0; }
              .token.property { color: #9cdcfe; }
              .editor-container {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 14px;
                line-height: 21px;
              }
              .editor-container textarea {
                outline: none !important;
              }
            `}</style>

            <div className="w-12 bg-[#1e1e1e] border-r border-zinc-800/50 flex flex-col items-end py-4 pr-3 text-[#858585] font-mono text-sm select-none z-10 shrink-0">
              {code.split('\n').map((_, i) => (
                <div key={i} className="leading-[21px]">{i + 1}</div>
              ))}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative">
              <Editor
                value={code}
                onValueChange={val => setCode(val)}
                highlight={val => Prism.highlight(val, Prism.languages.lua, 'lua')}
                padding={16}
                className="editor-container min-h-full text-[#d4d4d4]"
                style={{ minHeight: '100%' }}
              />
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="h-14 bg-[#18181b]/80 border-t border-zinc-800/80 flex items-center justify-between px-4 gap-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExecute}
                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]"
              >
                <Play size={16} fill="currentColor" />
                Execute
              </button>
              <button 
                onClick={handleClear}
                className="flex items-center justify-center w-10 h-10 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 text-zinc-300 rounded-md transition-colors relative group"
              >
                <Trash2 size={16} />
                <div className="absolute -top-8 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">Clear Editor</div>
              </button>
              <div className="w-px h-6 bg-zinc-700/50 mx-1"></div>
              <button 
                onClick={handleOpen}
                className="flex items-center justify-center w-10 h-10 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 text-zinc-300 rounded-md transition-colors relative group"
              >
                <FolderOpen size={16} />
                <div className="absolute -top-8 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">Open File</div>
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center justify-center w-10 h-10 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 text-zinc-300 rounded-md transition-colors relative group"
              >
                <Save size={16} />
                <div className="absolute -top-8 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">Save File</div>
              </button>
              <div className="w-px h-6 bg-zinc-700/50 mx-1"></div>
              <button 
                onClick={() => setCloudOpen(true)}
                className="flex items-center justify-center w-10 h-10 bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-indigo-400 rounded-md transition-colors relative group"
              >
                <Cloud size={18} />
                <div className="absolute -top-8 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 text-zinc-200">Cloud Scripts</div>
              </button>
              <button 
                onClick={() => toast.info("Console window opened")}
                className="flex items-center justify-center w-10 h-10 bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-indigo-400 rounded-md transition-colors relative group"
              >
                <TerminalSquare size={18} />
                <div className="absolute -top-8 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 text-zinc-200">Console</div>
              </button>
              <button 
                onClick={() => setClientsOpen(true)}
                className="flex items-center justify-center w-10 h-10 bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-indigo-400 rounded-md transition-colors relative group"
              >
                <Users size={18} />
                <div className="absolute -top-8 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 text-zinc-200">Clients</div>
              </button>
              <button 
                onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center w-10 h-10 bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors relative group"
              >
                <Settings size={18} />
                <div className="absolute -top-8 bg-zinc-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 text-zinc-200">Settings</div>
              </button>
            </div>
            
            <div>
              <button 
                onClick={handleInject}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all border ${
                  isAttached 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 hover:border-zinc-600 shadow-sm'
                }`}
              >
                <Plug size={16} className={isAttached ? 'text-emerald-400' : ''} />
                {isAttached ? 'Attached' : 'Inject'}
              </button>
            </div>
          </div>
        </div>

        {/* Script Hub Toggle Handle */}
        <div 
          onClick={() => setIsHubOpen(!isHubOpen)}
          className="w-4 bg-[#111113] border-l border-zinc-800/80 flex flex-col items-center justify-center cursor-pointer hover:bg-[#18181b] transition-colors group z-10"
          title={isHubOpen ? "Collapse Script Hub" : "Expand Script Hub"}
        >
          <div className="h-12 w-1.5 flex flex-col items-center justify-center gap-0.5 rounded-full bg-zinc-800 group-hover:bg-indigo-500/50 transition-colors">
            {isHubOpen ? <ChevronRight size={10} className="text-zinc-500 group-hover:text-indigo-300" /> : <ChevronLeft size={10} className="text-zinc-500 group-hover:text-indigo-300" />}
          </div>
        </div>

        {/* Right Sidebar - Script Hub */}
        <div 
          className={`bg-[#131315] border-l border-zinc-800/80 flex flex-col transition-all duration-300 ease-in-out ${
            isHubOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
          }`}
        >
          <div className="p-4 border-b border-zinc-800/80 min-w-[256px]">
            <h3 className="text-sm font-medium text-zinc-200 mb-3">Script Hub</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search scripts..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-1.5 pl-9 pr-3 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-w-[256px]">
            {filteredScripts.length === 0 && (
              <div className="text-xs text-zinc-600 px-2 py-4 text-center">
                {hubScripts.length === 0 ? 'No scripts saved yet.' : 'No matching scripts.'}
              </div>
            )}
            {filteredScripts.map((scriptName) => (
              <div 
                key={scriptName}
                onClick={() => postToHost({ action: 'loadScript', fileName: scriptName })}
                className="group flex items-center justify-between p-2 rounded-md hover:bg-zinc-800/50 cursor-pointer transition-colors"
                title="Click to load into editor"
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm text-zinc-300 truncate">{scriptName}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => executeHubScript(e, scriptName)}
                    className="p-1.5 text-zinc-400 hover:text-indigo-400 bg-zinc-800 rounded-md"
                    title="Execute directly"
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); postToHost({ action: 'deleteScript', fileName: scriptName }); }}
                    className="p-1.5 text-zinc-400 hover:text-red-400 bg-zinc-800 rounded-md"
                    title="Delete script"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="h-6 bg-[#111113] border-t border-zinc-800/80 flex items-center justify-between px-3 text-[10px] text-zinc-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isAttached ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-red-500'}`}></div>
            {isAttached ? 'Ready to execute' : 'Waiting for injection...'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span>v2.1.0</span>
        </div>
      </div>
      
      {/* Cloud Scripts Panel */}
      <CloudPanel visible={cloudOpen} onClose={() => setCloudOpen(false)} isAttached={isAttached} />

      {/* Settings Modal */}
      <div
        className={`absolute inset-0 z-40 flex items-center justify-center transition-all duration-300 ${
          settingsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backdropFilter: settingsOpen ? 'blur(8px)' : 'blur(0px)', background: settingsOpen ? 'rgba(0,0,0,0.5)' : 'transparent' }}
        onClick={() => setSettingsOpen(false)}
      >
        <div
          className={`bg-[#18181b] border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/40 w-[85%] h-[80%] flex flex-col overflow-hidden transition-all duration-300 ${
            settingsOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Settings Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-100">Settings</h2>
            </div>
            <button
              onClick={() => setSettingsOpen(false)}
              className="w-7 h-7 rounded-lg bg-zinc-800/40 hover:bg-zinc-700/40 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all border border-zinc-800/50"
            >
              <X size={14} />
            </button>
          </div>
          {/* Settings Body — empty for now */}
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center">
              <Settings size={32} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Settings coming soon</p>
              <p className="text-[10px] text-zinc-600 mt-1">Configuration options will appear here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Panel */}
      <div
        className={`absolute inset-0 z-40 flex flex-col bg-[#0c0c0e]/95 backdrop-blur-md transition-all duration-300 ${
          clientsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Clients Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-4">
            <VortexLogo />
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
                VORTEX <span className="text-zinc-500 font-normal text-[11px] uppercase tracking-wider">Clients</span>
              </h2>
              <p className="text-[10px] text-zinc-500 mt-1 font-medium">Connected Roblox instances</p>
            </div>
          </div>
          <button
            onClick={() => setClientsOpen(false)}
            className="w-8 h-8 rounded-lg bg-zinc-800/40 hover:bg-zinc-700/40 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all border border-zinc-800/50"
          >
            <X size={16} />
          </button>
        </div>
        {/* Clients Body — empty for now */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No clients connected</p>
            <p className="text-[10px] text-zinc-600 mt-1">Connected Roblox instances will appear here</p>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {saveModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-zinc-700/60 rounded-xl shadow-2xl w-80 p-5 flex flex-col gap-4 animate-in">
            <h3 className="text-sm font-semibold text-zinc-100">Save Script</h3>
            <input
              type="text"
              value={saveFileName}
              onChange={(e) => setSaveFileName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmSave(); if (e.key === 'Escape') setSaveModalOpen(false); }}
              autoFocus
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/60 transition-colors font-mono"
              placeholder="filename.lua"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-colors shadow-md shadow-indigo-500/20"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toaster */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        <Toaster 
          theme="dark" 
          position="bottom-right"
          visibleToasts={3}
          duration={2000}
          expand={false}
          toastOptions={{ 
            style: { 
              background: '#18181b', 
              border: '1px solid #27272a', 
              color: '#e4e4e7',
              pointerEvents: 'auto'
            } 
          }}
        />
      </div>
    </div>
  );
}

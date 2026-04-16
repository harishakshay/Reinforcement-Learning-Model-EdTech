import { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  Search, 
  Play, 
  Clock, 
  History, 
  Zap, 
  Filter, 
  CheckCircle2, 
  Video, 
  Image as ImageIcon, 
  Film,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type ContentType = 'Reel' | 'Video' | 'Photo';

interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  creator: string;
  duration?: string;
  thumbnail: string;
}

interface Toast {
  id: number;
  message: string;
}

// --- Mock Data ---

const MOCK_CONTENT: ContentItem[] = [
  {
    id: '1',
    title: 'AI in Healthcare',
    type: 'Video',
    creator: 'FutureMed',
    duration: '12:45',
    thumbnail: 'https://picsum.photos/seed/healthcare/800/450',
  },
  {
    id: '2',
    title: 'UI Design Trends 2026',
    type: 'Reel',
    creator: 'DesignFlow',
    duration: '0:45',
    thumbnail: 'https://picsum.photos/seed/uidesign/450/800',
  },
  {
    id: '3',
    title: 'Cloud Deployment Demo',
    type: 'Video',
    creator: 'CloudOps',
    duration: '08:20',
    thumbnail: 'https://picsum.photos/seed/cloud/800/450',
  },
  {
    id: '4',
    title: 'AWS Project Walkthrough',
    type: 'Video',
    creator: 'TechGuru',
    duration: '15:10',
    thumbnail: 'https://picsum.photos/seed/aws/800/450',
  },
  {
    id: '5',
    title: 'Resume Scanner Demo Reel',
    type: 'Reel',
    creator: 'CareerAI',
    duration: '0:58',
    thumbnail: 'https://picsum.photos/seed/resume/450/800',
  },
  {
    id: '6',
    title: 'Neural Network Visualization',
    type: 'Photo',
    creator: 'DataArt',
    thumbnail: 'https://picsum.photos/seed/neural/800/800',
  },
  {
    id: '7',
    title: 'Edge Computing Explained',
    type: 'Video',
    creator: 'EdgeMaster',
    duration: '10:05',
    thumbnail: 'https://picsum.photos/seed/edge/800/450',
  },
  {
    id: '8',
    title: 'Modern Architecture Tour',
    type: 'Photo',
    creator: 'ArchDigest',
    thumbnail: 'https://picsum.photos/seed/arch/800/1200',
  },
  {
    id: '9',
    title: 'Productivity Hacks',
    type: 'Reel',
    creator: 'LifeHacker',
    duration: '0:30',
    thumbnail: 'https://picsum.photos/seed/productivity/450/800',
  },
  {
    id: '10',
    title: 'Travel Vlog: Tokyo',
    type: 'Reel',
    creator: 'Wanderlust',
    duration: '0:55',
    thumbnail: 'https://picsum.photos/seed/tokyo/450/800',
  },
  {
    id: '11',
    title: 'Quick Recipe: Pasta',
    type: 'Reel',
    creator: 'ChefQuick',
    duration: '0:40',
    thumbnail: 'https://picsum.photos/seed/pasta/450/800',
  },
  {
    id: '12',
    title: 'Machine Learning Basics',
    type: 'Video',
    creator: 'EduTech',
    duration: '20:30',
    thumbnail: 'https://picsum.photos/seed/ml/800/450',
  },
  {
    id: '13',
    title: 'Cybersecurity 101',
    type: 'Video',
    creator: 'SecureNet',
    duration: '18:15',
    thumbnail: 'https://picsum.photos/seed/security/800/450',
  },
  {
    id: '14',
    title: 'Blockchain Revolution',
    type: 'Video',
    creator: 'CryptoInsight',
    duration: '25:00',
    thumbnail: 'https://picsum.photos/seed/blockchain/800/450',
  },
  {
    id: '15',
    title: 'Mountain Sunset',
    type: 'Photo',
    creator: 'NatureLens',
    thumbnail: 'https://picsum.photos/seed/mountain/800/600',
  },
  {
    id: '16',
    title: 'Urban Nightscape',
    type: 'Photo',
    creator: 'CityLights',
    thumbnail: 'https://picsum.photos/seed/city/800/600',
  },
  {
    id: '17',
    title: 'Minimalist Workspace',
    type: 'Photo',
    creator: 'DeskInspo',
    thumbnail: 'https://picsum.photos/seed/workspace/800/600',
  },
];

// --- Components ---

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | ContentType>('All');
  const [watchedHistory, setWatchedHistory] = useState<ContentItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [lastRecommendation, setLastRecommendation] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Filtered content
  const filteredContent = useMemo(() => {
    return MOCK_CONTENT.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || item.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const handleCardClick = (item: ContentItem) => {
    // Update Watched History (Reverse Chronological, unique)
    setWatchedHistory(prev => [item, ...prev.filter(h => h.id !== item.id)]);
    
    // Update Recommendation Status
    setLastRecommendation(item.title);
    
    // Add Toast
    const newToast = {
      id: Date.now(),
      message: `The recommendation layer has been successfully updated with ${item.title}`
    };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove toast after 3s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 3000);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchHistory(prev => [searchQuery.trim(), ...prev.filter(s => s !== searchQuery.trim())].slice(0, 10));
    }
  };

  return (
    <div className="min-h-screen font-sans bg-[#050505] text-white selection:bg-blue-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto glass-dark px-5 py-4 rounded-2xl border-l-4 border-l-blue-500 shadow-2xl max-w-md"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm font-medium text-white/90 leading-relaxed">
                  {toast.message}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="max-w-[1600px] mx-auto px-6">
        {/* Header Section */}
        <header className="sticky top-0 z-40 py-8 bg-[#050505]/90 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-8">
            <div className="flex-1 max-w-4xl mx-auto w-full">
              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reels, videos, photos..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-full py-4 pl-14 pr-72 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white/[0.05] transition-all placeholder:text-white/20"
                />
                <div className="absolute inset-y-0 right-2 flex items-center gap-1.5 px-2">
                  {(['All', 'Reel', 'Video', 'Photo'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        activeFilter === filter
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-12 pb-20">
          {/* Main Feed Section (70%) */}
          <main className="w-full lg:w-[70%]">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredContent.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ y: -4 }}
                    onClick={() => handleCardClick(item)}
                    className="group cursor-pointer"
                  >
                    <div className={`relative overflow-hidden rounded-3xl glass border-white/[0.05] transition-all group-hover:border-blue-500/30 ${
                      item.type === 'Reel' ? 'aspect-[9/16]' : 'aspect-video'
                    }`}>
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                      
                      {/* Play Icon Overlay */}
                      {(item.type === 'Reel' || item.type === 'Video') && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-xl shadow-blue-500/40">
                            <Play className="w-8 h-8 text-white fill-white ml-1" />
                          </div>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/90">
                          {item.type}
                        </span>
                        {item.duration && (
                          <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/90">
                            {item.duration}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 px-1">
                      <h3 className="text-lg font-semibold text-white/90 group-hover:text-blue-400 transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-white/40 mt-1 font-medium">
                        {item.creator}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {filteredContent.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-white/20">
                <Search className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-xl font-medium">No content found matching your search.</p>
              </div>
            )}
          </main>

          <aside className="w-full lg:w-[30%]">
            <div className="lg:sticky lg:top-[128px] flex flex-col gap-8">
              
              {/* Recently Watched */}
              <section className="glass-dark rounded-3xl p-6 border-white/[0.05]">
                <div className="flex items-center gap-2 mb-5">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">Recently Watched</h2>
                </div>
                <div className="flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {watchedHistory.length > 0 ? (
                      watchedHistory.slice(0, 5).map((item, idx) => (
                        <motion.div
                          key={`${item.id}-${idx}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer group"
                          onClick={() => handleCardClick(item)}
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white/80 truncate group-hover:text-blue-400 transition-colors">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-white/30 uppercase font-bold tracking-tighter mt-0.5">
                              {item.type} • {item.creator}
                            </p>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-sm text-white/20 italic py-4 text-center">No history yet</p>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* Search History */}
              <section className="glass-dark rounded-3xl p-6 border-white/[0.05]">
                <div className="flex items-center gap-2 mb-5">
                  <History className="w-5 h-5 text-purple-400" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">Search History</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {searchHistory.length > 0 ? (
                      searchHistory.map((term, idx) => (
                        <motion.button
                          key={`${term}-${idx}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={() => setSearchQuery(term)}
                          className="px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.05] text-xs font-medium text-white/60 hover:bg-white/[0.1] hover:text-white transition-all flex items-center gap-2 group"
                        >
                          {term}
                          <X 
                            className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchHistory(prev => prev.filter(s => s !== term));
                            }}
                          />
                        </motion.button>
                      ))
                    ) : (
                      <p className="text-sm text-white/20 italic py-2">No searches yet</p>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* Recommendation Layer Status */}
              <section className="glass-dark rounded-3xl p-6 border-white/[0.05] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                </div>
                
                <div className="flex items-center gap-2 mb-5">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">Recommendation Layer Status</h2>
                </div>

                <div className="space-y-4">
                  <AnimatePresence mode="wait">
                    {lastRecommendation ? (
                      <motion.div
                        key={lastRecommendation}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20 flex items-start gap-3 shadow-[0_0_20px_rgba(34,197,94,0.05)]"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-green-100/80 leading-relaxed font-mono">
                          The recommendation layer has been successfully updated with <span className="text-green-400 font-bold">{lastRecommendation}</span>
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3"
                      >
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                        <p className="text-sm text-white/20 font-mono">Awaiting user interaction...</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[10px] font-mono text-white/20 uppercase tracking-tighter">
                      <span>System Latency</span>
                      <span>14ms</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-500/40"
                        animate={{ width: ['20%', '80%', '40%', '90%', '60%'] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

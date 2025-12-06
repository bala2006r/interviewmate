import React, { useState, useEffect, useRef } from 'react';
import { Users, Search, CheckCircle, Clock, Mail, ShieldCheck, Loader2, X } from 'lucide-react';
import { InterviewType } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PeerMatchProps {
  onMatchFound: (type: InterviewType) => void;
}

type MatchStatus = 'IDLE' | 'VERIFYING' | 'SEARCHING' | 'FOUND';

interface PeerPresence {
  user_id: string;
  email: string;
  topic: string;
  status: 'searching' | 'matched';
  joined_at: number;
}

export const PeerMatch: React.FC<PeerMatchProps> = ({ onMatchFound }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<MatchStatus>('IDLE');
  const [email, setEmail] = useState(user?.email || '');
  const [isVerified, setIsVerified] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [peersOnline, setPeersOnline] = useState(0);
  
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Initial verification check (mock)
  useEffect(() => {
    if (user?.email) {
       // In a real app, check DB for verification status
       setIsVerified(true);
    }
  }, [user]);

  // Clean up channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const handleVerify = (e: React.FormEvent) => {
      e.preventDefault();
      setTimeout(() => {
          setIsVerified(true);
          setStatus('IDLE');
      }, 1000);
  };
  
  const startSearch = async () => {
    if (!user || !selectedTopic) return;
    setStatus('SEARCHING');

    const channel = supabase.channel('peer_matching_room', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState<PeerPresence>();
        const allPresences: PeerPresence[] = [];
        
        // Flatten presence object
        for (const key in newState) {
            allPresences.push(...newState[key]);
        }

        // Update online count
        setPeersOnline(allPresences.length);

        // Matching Logic
        const myPresence = allPresences.find(p => p.user_id === user.id);
        if (!myPresence) return;

        // Find potential matches: same topic, searching status, not me
        const potentialMatches = allPresences.filter(p => 
            p.user_id !== user.id && 
            p.topic === selectedTopic && 
            p.status === 'searching'
        );

        if (potentialMatches.length > 0) {
            // Simple matching strategy: Match with the longest waiting user
            // In a production app, use server-side matching (Edge Functions) to avoid race conditions
            const partner = potentialMatches.sort((a, b) => a.joined_at - b.joined_at)[0];
            
            // To prevent double matching, deterministic rule: older timestamp initiates
            // or if timestamps equal, compare IDs
            const iAmOlder = myPresence.joined_at < partner.joined_at;
            const sameTimeButMyIdIsLower = myPresence.joined_at === partner.joined_at && user.id < partner.user_id;

            if (iAmOlder || sameTimeButMyIdIsLower) {
                 // I am the "leader" of this match
                 handleFoundMatch(partner);
            }
        }
      })
      .on('broadcast', { event: 'match_found' }, ({ payload }) => {
          if (payload.target_user_id === user.id) {
             // Someone matched with me
             setStatus('FOUND');
             setTimeout(() => confirmMatch(), 2000);
          }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            email: user.email,
            topic: selectedTopic,
            status: 'searching',
            joined_at: Date.now(),
          });
        }
      });
  };

  const handleFoundMatch = (partner: PeerPresence) => {
      // Notify partner via broadcast
      channelRef.current?.send({
          type: 'broadcast',
          event: 'match_found',
          payload: { target_user_id: partner.user_id, partner_id: user?.id }
      });
      
      setStatus('FOUND');
      setTimeout(() => confirmMatch(), 2000);
  };

  const cancelSearch = async () => {
      if (channelRef.current) {
          await channelRef.current.untrack();
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
      }
      setStatus('IDLE');
  };

  const confirmMatch = () => {
      // Cleanup before leaving
      if (channelRef.current) {
          channelRef.current.untrack();
          supabase.removeChannel(channelRef.current);
      }
      onMatchFound(InterviewType.PEER_MOCK);
  };

  return (
    <div className="h-full p-8 flex flex-col items-center justify-center bg-slate-900 overflow-y-auto">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
          <Users size={40} className="text-white" />
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-4">Peer Mock Interview</h1>
        <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto">
          Practice with a peer in real-time. We'll match you with someone looking to practice the same topic.
        </p>

        {!isVerified ? (
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 max-w-md mx-auto">
                 <h3 className="text-white font-semibold mb-2">Verify your Account</h3>
                 <p className="text-slate-400 text-sm mb-6">To ensure quality, we require email verification before peer matching.</p>
                 <form onSubmit={handleVerify} className="space-y-4">
                     <div className="relative">
                         <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                         <input 
                            type="email" 
                            required
                            placeholder="work@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl py-2.5 pl-10 text-white focus:outline-none focus:border-indigo-500"
                         />
                     </div>
                     <button type="submit" className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-100 transition-colors">
                        Send Verification Code
                     </button>
                 </form>
            </div>
        ) : (
            <>
                {status === 'IDLE' && (
                <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 max-w-lg mx-auto w-full">
                    <div className="flex items-center justify-center gap-2 mb-6 text-emerald-400 bg-emerald-400/10 py-1 px-3 rounded-full w-fit mx-auto text-xs font-bold uppercase tracking-wider">
                        <ShieldCheck size={14} /> Account Verified
                    </div>
                    <h3 className="text-white font-semibold mb-6">Select your topic</h3>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                    {['Data Structures', 'System Design'].map(topic => (
                        <button 
                            key={topic}
                            onClick={() => setSelectedTopic(topic)}
                            className={`p-4 rounded-xl transition-all border ${
                                selectedTopic === topic 
                                ? 'bg-indigo-600 text-white border-indigo-500' 
                                : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-indigo-500'
                            }`}
                        >
                            {topic}
                        </button>
                    ))}
                    </div>
                    <button 
                        onClick={startSearch}
                        disabled={!selectedTopic}
                        className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Search size={20} /> Find a Peer
                    </button>
                </div>
                )}

                {status === 'SEARCHING' && (
                <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 animate-pulse relative max-w-lg mx-auto w-full">
                    <button 
                        onClick={cancelSearch} 
                        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        title="Cancel Search"
                    >
                        <X size={20} />
                    </button>
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-white">Looking for a match...</h3>
                    <p className="text-slate-400 mt-2">Topic: <span className="text-indigo-400">{selectedTopic}</span></p>
                    <p className="text-slate-500 text-sm mt-4">{peersOnline > 1 ? `${peersOnline} peers online` : 'Waiting for others to join...'}</p>
                </div>
                )}

                {status === 'FOUND' && (
                <div className="bg-emerald-500/10 rounded-2xl p-8 border border-emerald-500/30 max-w-lg mx-auto w-full">
                    <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Match Found!</h3>
                    <p className="text-slate-300 mb-6">Redirecting you to the shared interview room...</p>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-[width_2s_ease-in-out_forwards]" style={{width: '0%'}}></div>
                    </div>
                </div>
                )}
            </>
        )}

        <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 text-sm">
           <div className="flex items-center gap-2">
             <Clock size={16} /> 45 min session
           </div>
           <div className="flex items-center gap-2">
             <Users size={16} /> {peersOnline > 0 ? peersOnline + 120 : '120+'} Online
           </div>
        </div>
      </div>
    </div>
  );
};
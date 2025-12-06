import React from 'react';
import { Play, Code, Users, Zap, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-y-auto">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg">M</div>
             <span className="text-xl font-bold tracking-tight">MockMate</span>
          </div>
          <button 
            onClick={onGetStarted}
            className="bg-white text-slate-900 px-6 py-2.5 rounded-full font-bold hover:bg-indigo-50 transition-colors"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Master the Technical Interview.
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Practice real-time coding interviews with our advanced AI, track your progress on the DSA sheet, and collaborate with peers instantly.
          </p>
          <button 
            onClick={onGetStarted}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-lg px-10 py-4 rounded-full font-bold shadow-2xl shadow-indigo-500/30 transition-all transform hover:-translate-y-1 flex items-center gap-3 mx-auto"
          >
            <Play size={24} fill="currentColor" /> Start Practicing Now
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-20 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-colors">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                    <Zap size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">AI Voice Interviews</h3>
                <p className="text-slate-400">Real-time voice interaction with an AI that adapts to your skill level. Practice Behavioral, System Design, and Coding.</p>
            </div>
            <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition-colors">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-6">
                    <CheckCircle size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">DSA Progress Tracking</h3>
                <p className="text-slate-400">Integrated "Striver-like" sheet to track your progress across crucial patterns like Arrays, DP, and Graphs.</p>
            </div>
            <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-pink-500/50 transition-colors">
                <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-400 mb-6">
                    <Users size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Peer Match</h3>
                <p className="text-slate-400">Match with peers for mock interviews. Verify emails securely and schedule practice sessions.</p>
            </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-12 border-t border-slate-900 text-center text-slate-500">
        <p>&copy; 2025 MockMate. Built with Gemini 2.5.</p>
      </div>
    </div>
  );
};
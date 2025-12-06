import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronRight, Play, Trophy, Flame, Loader2 } from 'lucide-react';
import { InterviewSession } from '../types';
import { INITIAL_DSA_SHEET } from '../data/dsaSheet';
import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../services/databaseService';

interface DashboardProps {
  history: InterviewSession[];
  onStartPractice: () => void;
  loading?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ history, onStartPractice, loading = false }) => {
  const { user } = useAuth();
  const [dsaSheet, setDsaSheet] = useState(INITIAL_DSA_SHEET);
  const [expandedTopic, setExpandedTopic] = useState<string | null>('arrays');
  const [loadingProgress, setLoadingProgress] = useState(true);

  // Load completed problems from DB and merge with static sheet
  useEffect(() => {
    if (user) {
      databaseService.getCompletedProblems(user.id)
        .then(completedIds => {
          const completedSet = new Set(completedIds);
          
          setDsaSheet(prevSheet => prevSheet.map(topic => {
            const updatedProblems = topic.problems.map(p => ({
              ...p,
              isCompleted: completedSet.has(p.id)
            }));
            const completedCount = updatedProblems.filter(p => p.isCompleted).length;
            const progress = Math.round((completedCount / updatedProblems.length) * 100);
            return { ...topic, problems: updatedProblems, progress };
          }));
          setLoadingProgress(false);
        });
    }
  }, [user]);

  const toggleProblem = async (topicId: string, problemId: string, currentStatus: boolean) => {
    // Optimistic Update
    setDsaSheet(prev => prev.map(topic => {
      if (topic.id === topicId) {
        const updatedProblems = topic.problems.map(p => 
          p.id === problemId ? { ...p, isCompleted: !currentStatus } : p
        );
        const completedCount = updatedProblems.filter(p => p.isCompleted).length;
        const progress = Math.round((completedCount / updatedProblems.length) * 100);
        return { ...topic, problems: updatedProblems, progress };
      }
      return topic;
    }));

    // DB Update
    if (user) {
        await databaseService.toggleProblemCompletion(user.id, problemId, !currentStatus);
    }
  };

  const totalCompleted = dsaSheet.reduce((acc, topic) => acc + topic.problems.filter(p => p.isCompleted).length, 0);
  const totalProblems = dsaSheet.reduce((acc, topic) => acc + topic.problems.length, 0);
  const overallProgress = totalProblems > 0 ? Math.round((totalCompleted / totalProblems) * 100) : 0;

  return (
    <div className="p-6 lg:p-10 h-full overflow-y-auto bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400">Track your preparation and start new sessions.</p>
          </div>
          <button 
            onClick={onStartPractice}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <Play size={20} fill="currentColor" /> Start New Interview
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column: DSA Tracker */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <Flame className="text-orange-500" size={24} /> 
                 DSA Progress Tracker
               </h2>
               <span className="text-slate-400 text-sm">
                 {loadingProgress ? 'Syncing...' : `${totalCompleted} / ${totalProblems} Solved (${overallProgress}%)`}
               </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mb-6">
              <div className="bg-gradient-to-r from-orange-500 to-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
            </div>

            <div className="space-y-4">
              {dsaSheet.map((topic) => (
                <div key={topic.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {expandedTopic === topic.id ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                      <span className="font-semibold text-slate-200">{topic.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-24 bg-slate-800 rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${topic.progress}%` }}></div>
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{topic.progress}%</span>
                    </div>
                  </button>
                  
                  {expandedTopic === topic.id && (
                    <div className="border-t border-slate-800 bg-slate-900/50">
                      {topic.problems.map((prob) => (
                        <div key={prob.id} className="flex items-center justify-between p-4 hover:bg-slate-800/30 border-b border-slate-800/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleProblem(topic.id, prob.id, prob.isCompleted)} 
                              className="text-slate-500 hover:text-indigo-400 transition-colors"
                              disabled={loadingProgress}
                            >
                              {prob.isCompleted ? <CheckCircle size={20} className="text-emerald-500" /> : <Circle size={20} />}
                            </button>
                            <span className={`text-sm ${prob.isCompleted ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{prob.title}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            prob.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                            prob.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {prob.difficulty}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Stats & Recent */}
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
               <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                 <Trophy className="text-yellow-500" size={20} /> Achievements
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 p-4 rounded-xl text-center">
                    <span className="block text-2xl font-bold text-white mb-1">
                        {loading ? '-' : history.filter(h => new Date(h.date).getDate() === new Date().getDate()).length}
                    </span>
                    <span className="text-xs text-slate-400">Sessions Today</span>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-xl text-center">
                    <span className="block text-2xl font-bold text-indigo-400 mb-1">
                         {loading || history.length === 0 ? '-' : Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length) + '%'}
                    </span>
                    <span className="text-xs text-slate-400">Avg Score</span>
                  </div>
               </div>
            </div>

            {/* Recent History */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">Recent Sessions</h3>
              <div className="space-y-4">
                {loading && (
                    <div className="flex justify-center py-4">
                        <Loader2 className="animate-spin text-indigo-500" />
                    </div>
                )}
                {!loading && history.length === 0 && (
                    <span className="text-sm text-slate-500">No sessions yet. Start practicing!</span>
                )}
                {!loading && history.slice(0, 3).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{session.type}</div>
                      <div className="text-xs text-slate-500">{session.date} • {session.difficulty || 'Intermediate'}</div>
                    </div>
                    <div className={`text-sm font-bold ${
                        session.score >= 80 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                      {session.score}
                    </div>
                  </div>
                ))}
              </div>
              {history.length > 0 && (
                  <button className="w-full mt-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium">View All History</button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
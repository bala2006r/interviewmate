import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { InterviewRoom } from './components/InterviewRoom';
import { PeerMatch } from './components/PeerMatch';
import { LandingPage } from './components/LandingPage';
import { InterviewSetup } from './components/InterviewSetup';
import { AuthPage } from './components/AuthPage';
import { InterviewType, InterviewSession, InterviewConfig, DifficultyLevel } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { databaseService } from './services/databaseService';

function AuthenticatedApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [activeConfig, setActiveConfig] = useState<InterviewConfig | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load history from Supabase on mount
  useEffect(() => {
    if (user) {
      databaseService.getUserHistory(user.id)
        .then(data => {
          setHistory(data);
          setLoadingHistory(false);
        });
    }
  }, [user]);

  const handleStartSetup = () => {
    setCurrentView('interview-setup');
  };

  const handleConfigComplete = (config: InterviewConfig) => {
    setActiveConfig(config);
    setCurrentView('active-interview');
  };

  const endInterview = async () => {
    if (!activeConfig || !user) return;

    // Add mock result based on difficulty (In a real app, AI would generate this score)
    const baseScore = activeConfig?.difficulty === DifficultyLevel.ADVANCED ? 60 : 75;
    const randomBonus = Math.floor(Math.random() * 20);
    const score = baseScore + randomBonus;
    const duration = 34; // Mock duration
    const feedback = 'Session completed successfully. Good use of logic.';

    // Optimistically update local state
    const newSession: InterviewSession = {
      id: 'temp-' + Date.now(),
      type: activeConfig.type,
      date: new Date().toLocaleDateString(),
      duration: duration,
      score: score,
      feedbackSummary: feedback,
      difficulty: activeConfig.difficulty
    };
    
    setHistory([newSession, ...history]);
    setActiveConfig(null);
    setCurrentView('dashboard');

    // Save to Supabase
    try {
      await databaseService.saveSession(user.id, {
        type: activeConfig.type,
        difficulty: activeConfig.difficulty,
        score: score,
        duration: duration,
        feedbackSummary: feedback
      });
      // Reload to get the real ID and server timestamp
      const updatedHistory = await databaseService.getUserHistory(user.id);
      setHistory(updatedHistory);
    } catch (error) {
      console.error("Failed to save session");
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard history={history} onStartPractice={handleStartSetup} loading={loadingHistory} />;
      case 'peers':
        return <PeerMatch onMatchFound={(type) => handleConfigComplete({ type, difficulty: DifficultyLevel.INTERMEDIATE, focusOnCommunication: false })} />;
      case 'interview-setup':
        return <InterviewSetup onStart={handleConfigComplete} onCancel={() => setCurrentView('dashboard')} />;
      case 'active-interview':
        return activeConfig ? (
          <InterviewRoom config={activeConfig} onEndSession={endInterview} />
        ) : (
          <Dashboard history={history} onStartPractice={handleStartSetup} loading={loadingHistory} />
        );
      case 'history':
        return <Dashboard history={history} onStartPractice={handleStartSetup} loading={loadingHistory} />; // Reusing dashboard for now
      default:
        return <Dashboard history={history} onStartPractice={handleStartSetup} loading={loadingHistory} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Hide Sidebar during active interview or setup to focus attention */}
      {currentView !== 'active-interview' && currentView !== 'interview-setup' && (
        <Navigation currentView={currentView === 'interview-setup' ? 'interview' : currentView} onChangeView={(view) => {
            if (view === 'interview') {
                setCurrentView('interview-setup');
            } else {
                setCurrentView(view);
            }
        }} />
      )}
      
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center text-indigo-500">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  // Logic: 
  // 1. If not started (Landing page), show Landing Page.
  // 2. If user clicks start, check auth.
  // 3. If no user, show AuthPage.
  // 4. If user, show AuthenticatedApp.

  if (!hasStarted && !user) {
    return <LandingPage onGetStarted={() => setHasStarted(true)} />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
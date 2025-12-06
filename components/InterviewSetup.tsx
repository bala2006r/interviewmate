import React, { useState } from 'react';
import { ArrowLeft, Brain, Code, MessageSquare, Zap, Target, BookOpen } from 'lucide-react';
import { DifficultyLevel, InterviewConfig, InterviewType } from '../types';

interface InterviewSetupProps {
  onStart: (config: InterviewConfig) => void;
  onCancel: () => void;
}

export const InterviewSetup: React.FC<InterviewSetupProps> = ({ onStart, onCancel }) => {
  const [type, setType] = useState<InterviewType>(InterviewType.ALGORITHMS);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.INTERMEDIATE);
  const [focusCommunication, setFocusCommunication] = useState(false);
  const [customTopic, setCustomTopic] = useState('');

  const handleStart = () => {
    onStart({
      type,
      difficulty,
      topic: customTopic || undefined,
      focusOnCommunication: focusCommunication
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        <button onClick={onCancel} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-white mb-2">Configure Your Interview</h1>
        <p className="text-slate-400 mb-8">Customize the AI persona, difficulty, and focus area.</p>

        <div className="space-y-8">
          {/* Interview Type */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Brain size={16} /> Interview Focus
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: InterviewType.ALGORITHMS, icon: Code, label: 'Algorithms' },
                { id: InterviewType.SYSTEM_DESIGN, icon: Zap, label: 'System Design' },
                { id: InterviewType.BEHAVIORAL, icon: MessageSquare, label: 'Behavioral' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setType(item.id)}
                  className={`p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                    type === item.id 
                    ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <item.icon size={32} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Difficulty */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Target size={16} /> Difficulty Level
            </h3>
            <div className="bg-slate-800 p-1 rounded-xl flex">
              {[DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                    difficulty === level
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {difficulty === DifficultyLevel.BEGINNER && "Friendly AI, provides hints readily."}
              {difficulty === DifficultyLevel.INTERMEDIATE && "Standard interview pace, limited hints."}
              {difficulty === DifficultyLevel.ADVANCED && "Strict evaluation, optimal solutions required, no hints."}
            </p>
          </section>

          {/* Specific Topic */}
          <section>
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen size={16} /> Specific Topic (Optional)
            </h3>
            <input 
              type="text"
              placeholder={type === InterviewType.ALGORITHMS ? "e.g., Dynamic Programming, Graphs" : "e.g., Conflict Resolution, Leadership"}
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </section>

          {/* Communication Coach Mode */}
          <section>
            <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-700 bg-slate-800/50 cursor-pointer hover:bg-slate-800 transition-colors">
              <input 
                type="checkbox"
                checked={focusCommunication}
                onChange={(e) => setFocusCommunication(e.target.checked)}
                className="mt-1 w-5 h-5 rounded bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-800"
              />
              <div>
                <span className="font-semibold text-white block mb-1">Communication Coach Mode</span>
                <span className="text-sm text-slate-400">
                  The AI will prioritize feedback on your speaking clarity, pace, and conciseness over technical accuracy. Great for non-native speakers or refining soft skills.
                </span>
              </div>
            </label>
          </section>

          <button 
            onClick={handleStart}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-1"
          >
            Start Interview
          </button>
        </div>
      </div>
    </div>
  );
};
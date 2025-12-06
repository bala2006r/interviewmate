import { supabase } from './supabase';
import { InterviewSession, InterviewType, DifficultyLevel } from '../types';

export const databaseService = {
  // --- Interview History ---

  async getUserHistory(userId: string): Promise<InterviewSession[]> {
    const { data, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      type: item.interview_type as InterviewType,
      date: new Date(item.created_at).toLocaleDateString(),
      duration: item.duration_minutes,
      score: item.score,
      feedbackSummary: item.feedback,
      difficulty: item.difficulty as DifficultyLevel,
    }));
  },

  async saveSession(userId: string, session: Partial<InterviewSession>) {
    const { error } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: userId,
        interview_type: session.type,
        difficulty: session.difficulty,
        score: session.score,
        duration_minutes: session.duration,
        feedback: session.feedbackSummary,
      });

    if (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  },

  // --- DSA Progress ---

  async getCompletedProblems(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_dsa_progress')
      .select('problem_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching progress:', error);
      return [];
    }

    return data.map((row: any) => row.problem_id);
  },

  async toggleProblemCompletion(userId: string, problemId: string, isCompleted: boolean) {
    if (isCompleted) {
      // Add record
      const { error } = await supabase
        .from('user_dsa_progress')
        .insert({ user_id: userId, problem_id: problemId });
      
      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error marking problem complete:', error);
      }
    } else {
      // Remove record
      const { error } = await supabase
        .from('user_dsa_progress')
        .delete()
        .eq('user_id', userId)
        .eq('problem_id', problemId);

      if (error) {
        console.error('Error marking problem incomplete:', error);
      }
    }
  }
};
export enum InterviewType {
  ALGORITHMS = 'Algorithms',
  SYSTEM_DESIGN = 'System Design',
  BEHAVIORAL = 'Behavioral',
  PEER_MOCK = 'Peer Mock',
  COMMUNICATION = 'Communication Coach'
}

export enum DifficultyLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced'
}

export enum InterviewStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export interface InterviewConfig {
  type: InterviewType;
  difficulty: DifficultyLevel;
  topic?: string;
  focusOnCommunication: boolean;
}

export interface DSAProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isCompleted: boolean;
  link?: string;
}

export interface DSATopic {
  id: string;
  name: string;
  progress: number; // 0-100
  problems: DSAProblem[];
}

export interface InterviewSession {
  id: string;
  type: InterviewType;
  date: string;
  duration: number; // in minutes
  score: number; // 0-100
  feedbackSummary: string;
  difficulty: DifficultyLevel;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
}

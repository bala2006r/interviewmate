import { DSATopic } from '../types';

export const INITIAL_DSA_SHEET: DSATopic[] = [
  {
    id: 'arrays',
    name: 'Arrays & Hashing',
    progress: 30,
    problems: [
      { id: 'a1', title: 'Two Sum', difficulty: 'Easy', isCompleted: true },
      { id: 'a2', title: 'Contains Duplicate', difficulty: 'Easy', isCompleted: true },
      { id: 'a3', title: 'Product of Array Except Self', difficulty: 'Medium', isCompleted: false },
      { id: 'a4', title: 'Longest Consecutive Sequence', difficulty: 'Medium', isCompleted: false },
    ]
  },
  {
    id: 'pointers',
    name: 'Two Pointers',
    progress: 0,
    problems: [
      { id: 'tp1', title: 'Valid Palindrome', difficulty: 'Easy', isCompleted: false },
      { id: 'tp2', title: '3Sum', difficulty: 'Medium', isCompleted: false },
      { id: 'tp3', title: 'Container With Most Water', difficulty: 'Medium', isCompleted: false },
    ]
  },
  {
    id: 'sliding_window',
    name: 'Sliding Window',
    progress: 50,
    problems: [
      { id: 'sw1', title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', isCompleted: true },
      { id: 'sw2', title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', isCompleted: false },
    ]
  },
  {
    id: 'dp',
    name: 'Dynamic Programming (1D)',
    progress: 10,
    problems: [
      { id: 'dp1', title: 'Climbing Stairs', difficulty: 'Easy', isCompleted: true },
      { id: 'dp2', title: 'House Robber', difficulty: 'Medium', isCompleted: false },
      { id: 'dp3', title: 'Longest Increasing Subsequence', difficulty: 'Medium', isCompleted: false },
    ]
  }
];
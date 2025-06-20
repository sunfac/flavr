import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Timer {
  id: string;
  stepId: string;
  duration: number; // in seconds
  remaining: number;
  isActive: boolean;
  startTime?: number;
}

interface TimerStore {
  timers: Record<string, Timer>;
  
  // Actions
  startTimer: (stepId: string, duration: number) => void;
  pauseTimer: (stepId: string) => void;
  resumeTimer: (stepId: string) => void;
  resetTimer: (stepId: string) => void;
  updateTimer: (stepId: string, remaining: number) => void;
  clearTimer: (stepId: string) => void;
  clearAllTimers: () => void;
  
  // Timer rescaling when step durations change
  rescaleTimer: (stepId: string, newDuration: number) => void;
}

export const useTimerStore = create<TimerStore>()(
  devtools(
    (set, get) => ({
      timers: {},

      startTimer: (stepId: string, duration: number) => {
        const durationSeconds = duration * 60;
        set((state) => ({
          timers: {
            ...state.timers,
            [stepId]: {
              id: stepId,
              stepId,
              duration: durationSeconds,
              remaining: durationSeconds,
              isActive: true,
              startTime: Date.now(),
            },
          },
        }));
      },

      pauseTimer: (stepId: string) => {
        set((state) => ({
          timers: {
            ...state.timers,
            [stepId]: state.timers[stepId] 
              ? { ...state.timers[stepId], isActive: false }
              : state.timers[stepId],
          },
        }));
      },

      resumeTimer: (stepId: string) => {
        set((state) => ({
          timers: {
            ...state.timers,
            [stepId]: state.timers[stepId]
              ? { ...state.timers[stepId], isActive: true, startTime: Date.now() }
              : state.timers[stepId],
          },
        }));
      },

      resetTimer: (stepId: string) => {
        const state = get();
        const timer = state.timers[stepId];
        if (timer) {
          set((state) => ({
            timers: {
              ...state.timers,
              [stepId]: {
                ...timer,
                remaining: timer.duration,
                isActive: false,
                startTime: undefined,
              },
            },
          }));
        }
      },

      updateTimer: (stepId: string, remaining: number) => {
        set((state) => ({
          timers: {
            ...state.timers,
            [stepId]: state.timers[stepId]
              ? { ...state.timers[stepId], remaining }
              : state.timers[stepId],
          },
        }));
      },

      clearTimer: (stepId: string) => {
        set((state) => {
          const { [stepId]: removed, ...rest } = state.timers;
          return { timers: rest };
        });
      },

      clearAllTimers: () => {
        set({ timers: {} });
      },

      rescaleTimer: (stepId: string, newDuration: number) => {
        const state = get();
        const timer = state.timers[stepId];
        
        if (timer) {
          const progressRatio = (timer.duration - timer.remaining) / timer.duration;
          const newDurationSeconds = newDuration * 60;
          const newRemaining = newDurationSeconds * (1 - progressRatio);
          
          set((state) => ({
            timers: {
              ...state.timers,
              [stepId]: {
                ...timer,
                duration: newDurationSeconds,
                remaining: Math.max(0, newRemaining),
              },
            },
          }));
        }
      },
    }),
    {
      name: 'timer-store',
    }
  )
);
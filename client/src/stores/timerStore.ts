import { create } from 'zustand';

interface Timer {
  id: string;
  duration: number; // in seconds
  remaining: number; // in seconds
  isActive: boolean;
  isPaused: boolean;
  startTime?: number;
  endTime?: number;
}

interface TimerState {
  timers: Record<string, Timer>;
  activeTimerId: string | null;
}

interface TimerActions {
  startTimer: (id: string, duration: number) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  stopTimer: (id: string) => void;
  resetTimer: (id: string) => void;
  updateTimer: (id: string) => void;
  clearAllTimers: () => void;
}

type TimerStore = TimerState & TimerActions;

const useTimerStore = create<TimerStore>((set, get) => {
  // Timer update interval
  let intervalId: NodeJS.Timeout | null = null;

  const startInterval = () => {
    if (intervalId) clearInterval(intervalId);
    
    intervalId = setInterval(() => {
      const { timers, activeTimerId } = get();
      
      if (!activeTimerId || !timers[activeTimerId]?.isActive) return;
      
      const timer = timers[activeTimerId];
      const now = Date.now();
      const elapsed = Math.floor((now - (timer.startTime || now)) / 1000);
      const remaining = Math.max(0, timer.duration - elapsed);
      
      if (remaining === 0) {
        // Timer finished
        set((state) => ({
          timers: {
            ...state.timers,
            [activeTimerId]: {
              ...timer,
              remaining: 0,
              isActive: false,
              endTime: now
            }
          },
          activeTimerId: null
        }));
        
        // Timer completion notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Timer Complete!', {
            body: `Timer for ${timer.id} has finished`,
            icon: '/favicon.ico'
          });
        }
        
        // Audio notification
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {
            // Fallback to system beep
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
          });
        } catch (error) {
          console.log('Audio notification failed');
        }
        
        clearInterval(intervalId!);
        intervalId = null;
      } else {
        // Update remaining time
        set((state) => ({
          timers: {
            ...state.timers,
            [activeTimerId]: {
              ...timer,
              remaining
            }
          }
        }));
      }
    }, 1000);
  };

  return {
    timers: {},
    activeTimerId: null,

    startTimer: (id: string, duration: number) => {
      const now = Date.now();
      
      set((state) => ({
        timers: {
          ...state.timers,
          [id]: {
            id,
            duration,
            remaining: duration,
            isActive: true,
            isPaused: false,
            startTime: now,
            endTime: now + (duration * 1000)
          }
        },
        activeTimerId: id
      }));
      
      startInterval();
      
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    },

    pauseTimer: (id: string) => {
      const { timers } = get();
      const timer = timers[id];
      
      if (!timer || !timer.isActive) return;
      
      set((state) => ({
        timers: {
          ...state.timers,
          [id]: {
            ...timer,
            isActive: false,
            isPaused: true
          }
        },
        activeTimerId: state.activeTimerId === id ? null : state.activeTimerId
      }));
      
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },

    resumeTimer: (id: string) => {
      const { timers } = get();
      const timer = timers[id];
      
      if (!timer || timer.isActive || timer.remaining === 0) return;
      
      const now = Date.now();
      
      set((state) => ({
        timers: {
          ...state.timers,
          [id]: {
            ...timer,
            isActive: true,
            isPaused: false,
            startTime: now,
            endTime: now + (timer.remaining * 1000)
          }
        },
        activeTimerId: id
      }));
      
      startInterval();
    },

    stopTimer: (id: string) => {
      const { timers } = get();
      
      set((state) => ({
        timers: {
          ...state.timers,
          [id]: {
            ...timers[id],
            isActive: false,
            isPaused: false,
            remaining: 0
          }
        },
        activeTimerId: state.activeTimerId === id ? null : state.activeTimerId
      }));
      
      if (get().activeTimerId === null && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },

    resetTimer: (id: string) => {
      const { timers } = get();
      const timer = timers[id];
      
      if (!timer) return;
      
      set((state) => ({
        timers: {
          ...state.timers,
          [id]: {
            ...timer,
            remaining: timer.duration,
            isActive: false,
            isPaused: false,
            startTime: undefined,
            endTime: undefined
          }
        },
        activeTimerId: state.activeTimerId === id ? null : state.activeTimerId
      }));
      
      if (get().activeTimerId === null && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },

    updateTimer: (id: string) => {
      const { timers, activeTimerId } = get();
      
      if (activeTimerId !== id || !timers[id]?.isActive) return;
      
      const timer = timers[id];
      const now = Date.now();
      const elapsed = Math.floor((now - (timer.startTime || now)) / 1000);
      const remaining = Math.max(0, timer.duration - elapsed);
      
      set((state) => ({
        timers: {
          ...state.timers,
          [id]: {
            ...timer,
            remaining
          }
        }
      }));
    },

    clearAllTimers: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      
      set({
        timers: {},
        activeTimerId: null
      });
    }
  };
});

export { useTimerStore };
export type { Timer, TimerState, TimerActions };
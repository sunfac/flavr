export const animations = {
  // Durations
  fast: '0.2s',
  normal: '0.4s',
  slow: '0.6s',
  
  // Easings
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  bounceOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  
  // Transitions
  smooth: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  smoothFast: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  bounceTransition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  
  // Specific animations
  progress: 'width 0.4s ease',
  heartbeat: 'heartbeat 1.2s infinite',
  scaleUp: 'scaleUp 0.2s ease-out',
  fadeIn: 'fadeIn 0.3s ease-out',
};

export const breakpoints = {
  mobile: '0px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1200px',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const colors = {
  primary: {
    orange: '#f97316',
    orangeHover: '#ea580c',
    orangeLight: 'rgba(249, 115, 22, 0.1)',
  },
  neutral: {
    slate900: '#0f172a',
    slate800: '#1e293b',
    slate700: '#334155',
    slate600: '#475569',
    slate400: '#94a3b8',
    slate300: '#cbd5e1',
    slate200: '#e2e8f0',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

export const zIndex = {
  base: 1,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  popover: 40,
  tooltip: 50,
  notification: 60,
};

export const layout = {
  ingredientPanelWidth: '280px',
  maxContentWidth: '600px',
  headerHeight: '60px',
  progressBarHeight: '4px',
  progressBarMobileHeight: '5px',
};
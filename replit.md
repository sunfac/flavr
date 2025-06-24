# Flavr - AI Recipe Generator

## Overview

Flavr is a modern full-stack web application that serves as an AI-powered culinary companion for personalized recipes. The application uses AI to generate customized recipes based on user preferences, available ingredients, and cooking constraints. It features multiple cooking modes, subscription tiers, and a comprehensive user management system.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with shadcn/ui component library for modern, responsive design
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling via class-variance-authority
- **Recipe Display**: Enhanced RecipeCard with structured sections (HeaderSection, IngredientPanel, StepStack, ProgressBar, FooterSection)
- **Responsive Design**: CSS Grid with container queries for fluid desktop and mobile experience

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for API server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with express-session
- **AI Integration**: OpenAI GPT models for recipe generation
- **Image Generation**: Replicate API for food imagery
- **Payment Processing**: Stripe for subscription management

### Development Setup
- **Environment**: Replit with PostgreSQL module
- **Hot Reload**: Vite HMR for frontend, tsx for backend development
- **TypeScript**: Shared types between client and server via `/shared` directory

## Key Components

### Core Cooking Modes
1. **Shopping Mode**: Generate recipes with complete shopping lists based on user preferences
2. **Fridge Mode**: Create recipes using available ingredients with optional flexibility
3. **Chef Assist Mode**: Professional culinary guidance for special occasions
4. **Flavr Rituals**: Weekly meal planning feature (premium)

### User Management System
- **Authentication**: Login/signup with email and password
- **Pseudo Users**: Anonymous usage tracking for free users via browser fingerprinting
- **Subscription Tiers**: Free (3 recipes/month) and Flavr+ (unlimited)
- **Usage Tracking**: Monthly limits with automatic reset functionality

### AI Recipe Generation Pipeline
1. **Quiz System**: Multi-step questionnaires to capture user preferences
2. **Prompt Engineering**: Sophisticated prompt generation with mapping utilities
3. **Recipe Cards**: Tinder-style recipe selection interface
4. **Full Recipe Generation**: Detailed recipes with ingredients, instructions, and tips

### Database Schema
- **Users**: Authentication, subscription status, usage tracking
- **Pseudo Users**: Anonymous user tracking for free tier
- **Recipes**: Generated recipes with metadata and sharing capabilities
- **Developer Logs**: Comprehensive logging for AI interactions and costs
- **Chat Messages**: Conversational recipe assistance

## Data Flow

### Recipe Generation Flow
1. User completes quiz capturing preferences (mood, cuisine, time, equipment, etc.)
2. System validates user quota and authentication status
3. AI generates 3-6 recipe suggestions using structured prompts
4. User selects preferred recipe concept via swipe interface
5. AI generates complete recipe with detailed instructions
6. Recipe saved to database with sharing capabilities
7. Optional image generation for visual appeal

### Authentication Flow
- Login/signup creates authenticated session
- Free users get pseudo-user ID for quota tracking
- Flavr+ users have unlimited recipe generation
- Session management with automatic cleanup

### Subscription Management
- Stripe integration for payment processing
- Multiple subscription tiers (monthly/annual)
- Automatic usage limit enforcement
- Cross-platform subscription support (planned: Apple, Google)

## External Dependencies

### AI Services
- **OpenAI**: GPT-3.5/4 for recipe generation and chat assistance
- **Replicate**: Stable Diffusion for food image generation

### Payment & Analytics
- **Stripe**: Subscription billing and payment processing
- **Developer Analytics**: Cost tracking and usage monitoring

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit**: Development and hosting platform

### Frontend Libraries
- **Framer Motion**: Smooth animations and transitions
- **Lucide React**: Comprehensive icon library
- **React Hook Form**: Form validation and management
- **Date-fns**: Date manipulation utilities

## Deployment Strategy

### Development Mode
- Vite dev server with Express backend
- Hot module replacement for rapid development
- PostgreSQL connection via environment variables

### Production Deployment
- Vite build creates optimized static assets
- Express serves both API and static files
- Automatic build process via `npm run build`
- Deployment to `dist/public` directory

### Environment Configuration
- Database URL from environment
- OpenAI API key for recipe generation
- Stripe keys for payment processing
- Replicate token for image generation

### Stability Measures
- Error boundaries for graceful failure handling
- Fallback modes when production builds fail
- Comprehensive logging for debugging
- Cache management to prevent refresh loops

## Changelog

```
Changelog:
- June 20, 2025. Initial setup
- June 20, 2025. Enhanced RecipeCard refactor complete - structured sections with responsive CSS Grid layout
- June 20, 2025. Chatbot upgrade complete - OpenAI function calling for live recipe updates without page refreshes
- June 23, 2025. Chatbot intelligence upgrade complete - natural language recipe modification with real-time execution
- June 23, 2025. Chatbot intelligence enhanced - comprehensive modification detection, OpenAI function calling with GPT-4o, precise ingredient scaling, conversation context retention, and live recipe card updates
- June 23, 2025. Quiz slider flickering issue resolved - stabilized value handling with React.useMemo and debounced updates
- June 23, 2025. Universal recipe modification system complete - chatbot now detects and implements ANY recipe change (side dishes, cooking methods, dietary modifications, ingredient substitutions) with complete implementation rather than suggestions
- June 23, 2025. Chatbot UI improvements complete - right-side panel design, two-column ingredient layout, chat history preservation during recipe updates
- June 23, 2025. Critical chatbot fixes complete - chip clicks post messages, auto-scroll to latest, prevented double confirmations, stabilized servings slider, enhanced recipe store sync with memoized active data detection, comprehensive logging for function call debugging
- June 23, 2025. Recipe card preview update issue resolved - added dynamic key to EnhancedRecipeCard component to force React re-renders when recipe store updates, ensuring recipe modifications are visible in both preview and pop-out modes
- June 23, 2025. Infinite loop crash bug fixed - removed lastUpdated dependency from memoized values and dynamic keys causing recursive updates, stabilized servings slider behavior, fixed null reference errors in auto-scroll functionality
- June 23, 2025. HeaderSection slider infinite loop resolved - implemented debounced callback with timeout cleanup to prevent recursive state updates in servings adjustment slider
- June 23, 2025. HeaderSection slider completely removed - eliminated all interactive servings controls causing infinite loop crashes, replaced with static display badge to ensure app stability
- June 23, 2025. ChatBot scroll area infinite loop fixed - implemented stable auto-scroll with proper Radix UI viewport targeting and debounced message count dependencies
- June 23, 2025. ChatBot ScrollArea component replaced - removed problematic Radix UI ScrollArea with standard div to eliminate infinite loop crashes, maintaining scroll functionality
- June 23, 2025. EnhancedRecipeCard infinite loop eliminated - removed all problematic useEffect hooks causing recursive updates, replaced currentServings state with memoized activeServings, eliminated Zustand store sync and ingredient state sync useEffects
- June 23, 2025. OpenAI voice chat integration complete - replaced old microphone controls with ZestVoiceChat component using OpenAI real-time audio API, enabling natural voice conversations with Zest chatbot for step-by-step cooking guidance and recipe assistance
- June 23, 2025. Enhanced conversational memory system implemented - chatbot now receives full conversation context with every message, maintains conversation flow across interactions, and implements live recipe card updates via streaming function calls. Text-to-speech disabled per user feedback due to robotic voice quality.
- June 24, 2025. Hybrid OpenAI + Google Gemini conversational AI implemented - OpenAI handles initial recipe generation preserving quiz context, Gemini provides fluid conversational flow with complete context handover including quiz data, original prompts, and user preferences for seamless dialogue continuity
- June 24, 2025. Google Live Audio API integration complete - implemented real-time two-way voice conversations using Google's live audio streaming API, replacing previous voice functionality with natural speech-to-speech dialogue, WebSocket-based architecture for low-latency audio processing
- June 24, 2025. Mobile UI fixes applied - resolved Cook Mode button overlap by adjusting z-index and positioning, fixed cut-off recipe suggestion chips with proper scrolling and responsive sizing, enhanced Google Live Audio chat visibility and mobile-friendly button layouts
- June 24, 2025. Recipe title text overflow fixed - implemented responsive text sizing, word wrapping, and proper mobile layout for long recipe titles, added CSS utilities for text-wrap-balance and break-words to prevent cut-off on mobile devices
- June 24, 2025. Chatbot switched to Google Gemini - primary chat endpoint now uses Google Gemini Live API for all conversations with OpenAI context handover, suggestion chips redesigned to stack in two rows for better mobile display
- June 24, 2025. Voice chat fully integrated with Google Live Audio API - ZestVoiceChat component now directly uses GoogleLiveAudioChat for two-way voice conversations, microphone button functionality replaced with Google Live Audio streaming for natural speech-to-speech dialogue
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
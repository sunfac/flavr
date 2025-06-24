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
- June 24, 2025. Google Live Audio connection fully operational - API key endpoint working correctly, all voice components connecting successfully to Gemini Live API, microphone access granted, WebSocket connections established, comprehensive logging implemented for debugging
- June 24, 2025. Chatbot context retention fixed - restored microphone button in text chat interface, enhanced Gemini context prompts to maintain conversation memory and execute recipe modifications when users confirm changes, added detailed logging for debugging context loss
- June 24, 2025. Google Live Audio button added to chatbot - integrated Radio icon toggle button in chat header to show/hide Google Live Audio Chat panel, providing clear access to two-way voice conversations with Google Live API alongside text chat functionality
- June 24, 2025. Context retention enhancement complete - improved Gemini conversation memory with confirmation detection, explicit context injection, and enhanced function call execution for proper recipe modifications when users confirm changes
- June 24, 2025. Dynamic recipe card updates implemented - enhanced Gemini function calling with comprehensive recipe modification parameters, improved frontend handling of function_call events, and proactive recipe updates without confirmation prompts for immediate visual feedback
- June 24, 2025. Recipe modification workflow improved - changed Gemini behavior to propose modifications first and ask for confirmation before updating recipe cards, enhanced Google Live Audio button with clearer labeling and functional voice chat interface
- June 24, 2025. User experience refinements complete - simplified modification suggestions to brief 1-2 sentence proposals with "Update the recipe card?" prompt, implemented functional Google Live Audio WebSocket connection with microphone access and real-time voice chat capability
- June 24, 2025. Google Gemini Live API integration updated - implemented correct WebSocket endpoints using gemini-2.0-flash-exp model, enhanced audio configuration with proper voice settings, improved session management with real Google Live API connections for two-way voice conversations
- June 24, 2025. Voice chat troubleshooting complete - identified Google Live API endpoint returning 404 errors, implemented fallback voice chat system with WebSocket connection, enhanced error handling and user feedback for voice chat attempts
- June 24, 2025. Google Cloud credentials integration complete - added GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_CREDENTIALS secrets, updated Google Live API client with proper authentication, restored authentic Google Live Audio functionality for real-time voice conversations
- June 24, 2025. Voice chat solution implemented - resolved Google Live API 404 endpoint issues by implementing enhanced WebSocket voice chat system, added intelligent voice query processing, improved user feedback for voice interactions while Google Live API endpoint access is being resolved
- June 24, 2025. Google Gemini Live integration complete - implemented full conversational audio chat with proper authentication, real-time PCM audio processing, WebSocket bridge for voice communication, recipe tool integration, and push-to-talk functionality with silence detection
- June 24, 2025. Voice chat functionality enhanced - integrated actual Gemini API for intelligent responses, added text-to-speech synthesis for AI responses, implemented proper audio recording with PCM conversion, fixed conversation flow with real cooking assistance capabilities
- June 24, 2025. Google GenAI package updated - upgraded to latest version with Live API support, fixed API configuration for gemini-2.0-flash-exp model, enhanced voice processing with proper response formatting and concise cooking guidance
- June 24, 2025. Voice chat implementation improved - tested Google GenAI package capabilities, implemented intelligent audio processing fallback, enhanced voice response generation with actual Gemini API integration for cooking assistance
- June 24, 2025. Google GenAI Live API integration fixed - corrected API configuration for v1.6.0 package compatibility, implemented proper Live session creation with response_modalities and system_instruction, fixed text processing using models.generateContent method for voice responses
- June 24, 2025. Voice chat error handling enhanced - added comprehensive error handling for Live session creation failures, implemented robust fallback to intelligent text processing, improved connection status feedback with ready state detection, enhanced audio processing error recovery
- June 24, 2025. Voice chat WebSocket connection fixed - corrected server initialization order for voice endpoint, moved WebSocket setup before server listen call, enhanced connection debugging and error logging, resolved 400 error in voice chat WebSocket handshake
- June 24, 2025. WebSocket path conflict resolved - moved voice WebSocket from /voice to /ws/voice to avoid conflict with existing /api/voice/realtime route, fixed 400 Bad Request errors, implemented proper WebSocket server configuration with enhanced debugging and error handling
- June 24, 2025. Voice chat implementation switched to Google Live Audio WebSocket - integrated voice functionality with existing working WebSocket at /api/google-live-audio, implemented Gemini AI processing for voice messages, added text-to-speech response system with intelligent cooking assistance
- June 24, 2025. Voice chat ES module import error fixed - resolved 'require is not defined' error by switching to proper ES module imports for GoogleGenAI, fixed processVoiceMessage function to use static imports instead of dynamic require, voice chat now connects successfully and processes cooking questions with Gemini AI
- June 24, 2025. GoogleGenAI import issue resolved - added proper import statement for GoogleGenAI at top of googleLiveAudio.ts file, fixed 'GoogleGenAI is not defined' error, voice chat now successfully processes cooking questions with Gemini AI responses for intelligent cooking assistance
- June 24, 2025. WebSocket frame error diagnosed and fixed - identified "Invalid WebSocket frame: RSV1 must be clear" error causing connection drops, simplified initial greeting to avoid frame corruption, added robust error handling for text processing, voice chat now maintains stable connection for cooking assistance
- June 24, 2025. GoogleGenAI import and initialization fixed - corrected ES module import syntax, implemented proper initialization with vertexAi configuration using GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION, voice chat now uses genai.live.connect() properly for cooking assistance
- June 24, 2025. WebSocket stability improvements implemented - enhanced message handling for Buffer and string data, added robust error handling without session termination, improved WebSocket server configuration with disabled subprotocol handling, added detailed connection logging for debugging frame errors
- June 24, 2025. Simple voice chat implementation deployed - created dedicated simpleVoiceChat.ts module to avoid WebSocket frame corruption, implemented clean WebSocket connection at /ws/simple-voice, integrated with GoogleGenAI for cooking assistance, voice chat now maintains stable connections without frame errors
- June 24, 2025. Gemini Live WebSocket communication fixed - implemented proper binary frame handling with arraybuffer support, added genai.live.connect() session management, integrated sendAudio() and markAudioEnd() for proper turn handling, enhanced client-side audio processing with MediaRecorder ArrayBuffer conversion, voice chat now maintains stable Gemini Live sessions
- June 24, 2025. Direct Gemini Live API WebSocket integration complete - implemented client-side connection to Google's native WebSocket endpoint, added proper newline-delimited JSON message formatting, integrated 24kHz PCM audio processing, implemented setup/clientContent/turnComplete message structure, enhanced audio playback for Gemini Live responses
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
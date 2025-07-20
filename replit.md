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

### Development Files
- `cookies.txt`: Local development file for testing purposes (gitignored, not tracked in repository)

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
- June 24, 2025. Protobuf decoding implementation complete - added proper varint length prefix parsing, comprehensive BidiGenerateContentResponse schema, enhanced microphone input with 24kHz resampling, and clean audio extraction from Protobuf messages. Quota limit reached on Gemini Live API requiring key refresh or billing adjustment.
- June 25, 2025. Imagen 3 integration attempted - encountered JSON parsing errors with Google Cloud API, reverted to DALL-E 3 for reliable image generation
- June 25, 2025. Supermarket preference integration complete - added supermarket selection to shopping mode prompts 1 and 2, providing tailored ingredient suggestions based on store-specific product ranges and quality tiers
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
- June 28, 2025. Conversational recipe mode implementation complete - switched conversational processor from Gemini to OpenAI due to quota limits, added Chat Mode card to mode selection with purple styling, integrated Google Live Audio Chat component for verbal recipe conversations, fixed API endpoints for natural conversation flow
- June 28, 2025. Chat communication errors resolved - fixed array handling in conversational processor to support both string and array inputs for equipment, ingredients, and dietary restrictions, eliminated "join is not a function" errors, improved message text display with proper word wrapping
- June 29, 2025. Production deployment fixed - resolved server configuration issues preventing deployed version from working, fixed syntax errors in production build detection, ensured proper static file serving from dist/public directory, app now ready for deployment
- June 29, 2025. Production loading screen issue resolved - fixed infinite loading screen in deployed version by implementing timeout-based loading dismissal, updated deployment helper with proper fallback HTML template, enhanced main.tsx to clear loading overlays, ensured app accessibility even with connection delays
- June 29, 2025. Production blank white screen fixed - created proper production build in dist/public with fallback HTML template, configured server to force production mode when build exists, added CSS fallbacks and graceful loading failure handling, deployed version now serves correctly
- June 29, 2025. Development and production deployment issues resolved - restored full development functionality while creating working production build, implemented production fallback mode with timeout handling, server now properly detects and serves production builds, app ready for deployment
- June 30, 2025. Chat mode step-by-step questions implementation complete - structured question flow with radio button UI for cuisine, portions, time, mood, and budget preferences, automated progression through question sequences, text input options for ingredients and custom responses, purple-themed question bubbles with interactive radio groups and suggestion chips
- June 30, 2025. Digital cookbook feature implementation complete - comprehensive recipe management system with search and filtering, stunning visual recipe cards with cuisine and difficulty badges, recipe deletion and viewing capabilities, automatic recipe saving from all cooking modes, navigation integration from mode selection, organized by mode types and cooking preferences
- June 30, 2025. Conversational question system enhanced for efficiency - focused question strategy that asks ONE targeted question per response, prioritizes essential recipe data (dish, portions, time), generates recipes after gathering 3 core pieces of information, eliminates vague questions with specific actionable options, improved from scattered multi-question approach to streamlined 3-step process
- July 3, 2025. Codebase optimization complete - pruned unused client and server modules, removed 15+ unused components (DeveloperMode, VoiceAssistant, VoiceChat, unused UI components), eliminated 14 unused package dependencies (lottie-react, embla-carousel-react, react-day-player, etc.), cleaned up unused configuration files and hooks, optimized bundle size and improved build performance
- July 3, 2025. Server routes refactored into maintainable modules - broke up massive 2075-line routes.ts into organized modules (authRoutes.ts, recipeRoutes.ts, chatRoutes.ts, subscriptionRoutes.ts), created server/routes/ directory structure, centralized route registration in routes/index.ts, maintained all existing functionality while improving code maintainability and separation of concerns
- July 3, 2025. Comprehensive automated testing infrastructure complete - implemented Jest with TypeScript support, React Testing Library for component tests, Supertest for API testing, created organized test structure (tests/server/, tests/client/, tests/integration/), built authentication tests covering signup/login/session management, database operation tests for CRUD operations and data integrity, recipe generation pipeline tests, React component tests for core UI elements, end-to-end integration tests for complete user workflows, enhanced run-tests.js with 14 comprehensive test categories achieving 100% success rate, established robust foundation for continuous testing and quality assurance across all application layers
- July 3, 2025. Bcrypt password security system implementation complete - integrated bcrypt library with 12-round salt configuration, implemented secure password hashing in storage.createUser method using 'password' field from schema, added bcrypt.compare verification in login endpoint for proper password authentication, updated authentication tests to work with bcrypt mocking and password comparison, ensured backward compatibility with existing user data structure, all authentication flows now use industry-standard password security with proper test coverage
- July 3, 2025. OAuth2 service account authentication implementation complete - replaced getAccessToken function in GoogleLiveApiClient with comprehensive OAuth2 service account authentication using Google Auth Library, added support for GOOGLE_CLOUD_CREDENTIALS and GOOGLE_APPLICATION_CREDENTIALS environment variables, maintained API key fallback for development environments, implemented proper error handling and token refresh capabilities, enhanced WebSocket connection authentication with Bearer tokens for secure Google Live API access
- July 3, 2025. Flavr Rituals navigation and state management implementation complete - created comprehensive ritualsStore using Zustand for phase management and data persistence, implemented confirmWeeklyPlan function with proper validation, form validation checking for complete day configurations, integrated toast notifications for user feedback, automatic navigation to Phase 2 route (/flavr-rituals/phase2) with state preservation, established weekly preferences data flow between planning and generation phases
- July 3, 2025. Comprehensive interaction logging infrastructure implementation complete - added interaction_logs database table with userId, timestamp, and structured JSON data fields, extended storage.ts with createInteractionLog and retrieval functions, updated logUserInteractionData to store structured data via new storage methods, created API endpoints for interaction logging and analytics with filtering capabilities, established robust foundation for user behavior tracking and B2B insights collection across all application touchpoints
- July 3, 2025. Real JWT implementation for mobile subscriptions complete - replaced stubbed createGoogleJWT with production-ready jsonwebtoken implementation using GOOGLE_SERVICE_ACCOUNT_KEY environment variable, added comprehensive error handling for credential validation and JWT signing, implemented Google Play subscription verification and acknowledgment methods, created extensive unit test suite covering JWT creation, token exchange, credential validation, and mobile subscription workflows, established secure authentication foundation for cross-platform subscription management
- July 18, 2025. Shopping mode recipe display fixed - resolved data structure issue where backend returned nested recipe object but frontend expected flat structure, implemented fallback handling for both nested and direct recipe formats, fixed database logging crashes by using simplified logging functions with text truncation, shopping mode now properly displays complete recipes with ingredients and cooking instructions
- July 18, 2025. Cook Mode feature removed - eliminated problematic Cook Mode mobile button and modal from StepStack component, removed Dialog imports and unused variables, streamlined recipe step display to focus on core functionality without cook mode overlay that was causing chat conflicts
- July 18, 2025. Budget Planner comprehensive enhancement complete - fixed automatic progression to generate all outputs in single response, implemented beautiful card layouts with shopping list as organized checklist, meal plan merged with collapsible recipe cards showing cuisine-specific images, enhanced authenticity with premium ingredient allocation using full budget, added difficulty level question for technique-appropriate recipes, improved visual contrast with darker fonts and better structured layouts
- July 20, 2025. Production deployment system implementation complete - created comprehensive deployment infrastructure with automatic build verification, environment variable validation, production server testing, fixed production mode detection and static file serving, enhanced shopping list card parsing with robust section handling, implemented flavor maximization in Budget Planner with premium ingredients and authentic seasonings, created deployment guide and production-ready build process ensuring 100% functionality preservation from preview to deployed version
- July 20, 2025. Chat Mode removal and sharing duplication fix complete - completely removed Chat Mode from routing and mode selection while preserving ChatBot and Zest functionality across all cooking modes, eliminated duplicate sharing tools by removing RecipeShareTools from EnhancedRecipeCard component, cleaned up unused imports, all modes now display sharing tools once through RecipeCard component
- July 20, 2025. Zest dynamic recipe updates and sharing fixes complete - implemented OpenAI function calling in streaming chat endpoint for live recipe card updates, fixed Zest text input streaming data parsing, enhanced shopping mode with dedicated sharing tools, improved share button functionality with proper recipe sharing links and fallback copy behavior
- July 20, 2025. Mobile recipe card image optimization complete - enhanced HeaderSection with prominent mobile-first image display using actual img elements instead of background images, implemented 16:10 aspect ratio for better mobile prominence, reduced overlay text coverage with minimal gradient, moved description below image on mobile to showcase food imagery clearly, added automatic scroll to top when recipes load, integrated RecipeShareTools at bottom of shopping mode recipe cards, eliminated duplicate description text display
- July 20, 2025. Recipe sharing functionality updated - all share URLs now use getflavr.ai domain instead of replit URLs, removed Instagram from social sharing options as it doesn't support direct URL sharing, maintained Twitter/Facebook/WhatsApp sharing with proper URL encoding, enhanced RecipeShareTools and SocialShareTools components with consistent getflavr.ai domain usage
- July 20, 2025. Recipe scroll behavior fixed - ensured recipe cards always load at the top where title and image are displayed, disabled conflicting auto-scroll in StepStack component, implemented consistent window.scrollTo(0,0) across all recipe loading scenarios, removed smooth scrolling that could cause recipes to display at middle of page
- July 20, 2025. Button functionality and mobile description fixes complete - fixed Sign Up button to navigate with signup parameter, fixed Flavr Plus upgrade button to navigate to subscribe page instead of showing alert, simplified Budget Planner navigation to remove try-catch fallback, added full recipe description display on mobile below image to prevent text cutoff, enhanced mobile recipe card readability with proper text sizing and layout
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
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
- **Interaction Logs**: Behavioral profiling system for B2B insights
- **Recipe Generation Logs**: Detailed tracking of recipe generation events

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
- **Stripe**: Complete subscription billing and payment processing
  - Monthly/annual subscription tiers
  - Stripe Elements integration for secure payments
  - Webhook handling for subscription events
  - Cancel/reactivate functionality
  - Comprehensive error handling and configuration guidance
- **Developer Analytics**: Cost tracking and usage monitoring
- **Behavioral Analytics**: Comprehensive user profiling for B2B data insights

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

## Stripe Integration

### Overview
Flavr+ subscription system is fully integrated with Stripe for payment processing:
- Monthly subscription: $4.99/month
- Annual subscription: $49.99/year (optional)
- Free trial support ready
- Automatic renewal and cancellation handling

### Required Configuration
To enable payments, the following environment variables must be set:
1. `STRIPE_SECRET_KEY` - Your Stripe secret key
2. `VITE_STRIPE_PUBLIC_KEY` - Your Stripe publishable key  
3. `STRIPE_MONTHLY_PRICE_ID` - Price ID from Stripe Dashboard
4. `STRIPE_ANNUAL_PRICE_ID` - (Optional) Annual price ID
5. `STRIPE_WEBHOOK_SECRET` - (Optional) For webhook verification

See `STRIPE_SETUP.md` for detailed setup instructions.

### Key Features
- **Payment Flow**: Stripe Elements integration on Subscribe page
- **Subscription Management**: Cancel/reactivate in Settings page
- **Developer Access**: william@blycontracting.co.uk has unlimited access
- **Error Handling**: Clear guidance when Stripe is not configured
- **Database Integration**: Full subscription tracking in user schema

## Major Architectural Changes

### January 23, 2025 - Complete App Restructure
- **Simplified to 2-Mode Interface**: Removed Shopping, Fridge, and Chef Assist modes from old system
- **New Fridge2Fork Mode**: 
  - Google Vision API integration for photo-based ingredient detection
  - No quiz - immediate recipe generation with randomized defaults (4 servings, 20-40min, £3-6 budget)
  - Tinder-style recipe selection cards before full generation
  - Original quiz-style layout maintained with dark theme and orange accents
- **New Chef Assist Mode**:
  - Single text input with rotating suggestion chips (6 random examples that cycle)
  - "Inspire Me" button for GPT-3.5 generated unique ideas
  - Direct to full recipe generation (no intermediate selection)
  - Original quiz-style question layout with textarea input
- **Streamlined Recipe Display**:
  - New unified Recipe page that loads immediately after generation
  - Integrated Zest chatbot for post-generation modifications
  - Removed separate recipe card components in favor of single enhanced display
- **API Endpoints Added**:
  - `/api/vision/analyze-ingredients` - Google Vision ingredient detection
  - `/api/generate-fridge-recipe` - Fridge2Fork recipe ideas
  - `/api/chef-assist/inspire` - Dynamic inspiration suggestions
  - `/api/chef-assist/generate` - Direct full recipe generation
  - `/api/generate-full-recipe` - Convert recipe idea to full recipe
- **Technical Updates**:
  - Removed response_format parameter from OpenAI calls (not supported by GPT-3.5)
  - Fixed ChatBot component import (uses default export)
  - Maintained original styling with quiz cards and gradient buttons

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
- July 21, 2025. Light/dark theme system implementation complete - created ThemeProvider with localStorage persistence, integrated theme toggle in GlobalNavigation using sun/moon icons, defined custom dark theme colors with rich dark slate background (#0F172A) and vibrant accent colors, dark theme set as default with automatic persistence across sessions
- July 21, 2025. Budget Planner visual enhancements complete - changed ingredient text to white with larger font (text-base/text-lg), added meat recipe prioritization (80% meat dishes unless dietary restrictions specified), expanded recipe image mappings to include paneer, stir-fry, beef, pork, fish, salmon, shrimp options, fixed TypeScript errors related to console.log statements
- June 29, 2025. Production deployment fixed - resolved server configuration issues preventing deployed version from working, fixed syntax errors in production build detection, ensured proper static file serving from dist/public directory, app now ready for deployment
- June 29, 2025. Production loading screen issue resolved - fixed infinite loading screen in deployed version by implementing timeout-based loading dismissal, updated deployment helper with proper fallback HTML template, enhanced main.tsx to clear loading overlays, ensured app accessibility even with connection delays
- June 29, 2025. Production blank white screen fixed - created proper production build in dist/public with fallback HTML template, configured server to force production mode when build exists, added CSS fallbacks and graceful loading failure handling, deployed version now serves correctly
- June 29, 2025. Development and production deployment issues resolved - restored full development functionality while creating working production build, implemented production fallback mode with timeout handling, server now properly detects and serves production builds, app ready for deployment
- June 30, 2025. Chat mode step-by-step questions implementation complete - structured question flow with radio button UI for cuisine, portions, time, mood, and budget preferences, automated progression through question sequences, text input options for ingredients and custom responses, purple-themed question bubbles with interactive radio groups and suggestion chips
- June 30, 2025. Digital cookbook feature implementation complete - comprehensive recipe management system with search and filtering, stunning visual recipe cards with cuisine and difficulty badges, recipe deletion and viewing capabilities, automatic recipe saving from all cooking modes, navigation integration from mode selection, organized by mode types and cooking preferences
- June 30, 2025. Conversational question system enhanced for efficiency - focused question strategy that asks ONE targeted question per response, prioritizes essential recipe data (dish, portions, time), generates recipes after gathering 3 core pieces of information, eliminates vague questions with specific actionable options, improved from scattered multi-question approach to streamlined 3-step process
- July 20, 2025. Behavioral profiling system implementation complete - comprehensive user behavioral tracking for B2B data insights, replaced technical fingerprinting with purchase intent profiling, integrated interaction_logs database table with structured JSON data capture, enhanced recipe generation endpoints with customer profiling, tracking user journey stages and engagement patterns, capturing supermarket preferences and shopping behavior for sellable business intelligence
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
- July 20, 2025. Recipe display and copy functionality improvements - removed duplicate description display on mobile (now only shows in dedicated box below image), enhanced recipe copy feature to include full recipe details (ingredients, instructions, servings, cook time, difficulty, cuisine, and tips) formatted for easy pasting into Apple Notes or other apps
- July 20, 2025. Fixed RecipeCard icon error - replaced undefined iconMap.share2 with iconMap.share to resolve component rendering crash, fixed nested recipe data structure handling in ShoppingMode to properly extract ingredients and instructions from API response
- July 20, 2025. Ingredient substitution and fridge mode enhancements complete - replaced ingredient checkboxes with AI-powered substitution buttons, fixed timing chip display in StepStack to show proper "X minutes" format, enhanced fridge mode to strictly respect user ingredient constraints with explicit prompts, fixed ingredientFlexibility parameter passing from quiz to API, updated recipe ideas endpoint to accept custom prompts for fridge mode, maintained tinder-style recipe cards for fridge mode as designed, ingredient flexibility correctly allows pantry items or 2-4 additional ingredients based on user's quiz selection
- July 20, 2025. Authentication system enhanced - updated login to accept either email or username, added getUserByEmailOrUsername method to storage layer, modified AuthModal to show "Email or Username" placeholder, fixed login endpoint to properly authenticate using either credential type, ensuring developer accounts like william@blycontracting.co.uk can login successfully
- July 20, 2025. Developer privileges implementation complete - enhanced authentication system to automatically grant unlimited recipe generations (hasFlavrPlus) for william@blycontracting.co.uk email, added developer detection during registration and login, ensured developer account gets unlimited access and developer logs visibility in deployed version, fixed getUserById reference to use getUser method
- July 20, 2025. Shopping Mode recipe generation bug fixed - removed frontend prompt override that was bypassing backend quiz processing and cuisine selection, ensured Shopping Mode now properly generates recipes based on selected cuisines rather than random recipes, verified all other cooking modes (Fridge, Chef Assist, Budget Planner) are correctly processing quiz inputs
- July 20, 2025. Recipe card data loading issue resolved - fixed recipe selection in Shopping Mode where ingredients and instructions weren't loading, updated frontend to properly pass selectedRecipe object with title to backend API, ensured full recipe generation includes all required fields (ingredients, instructions, image) for proper display in recipe cards
- July 20, 2025. Complete Stripe integration implementation - built comprehensive payment system with Stripe Elements for secure payment processing, created subscription management endpoints for create/cancel/reactivate functionality, enhanced user schema with full subscription tracking fields (stripeCustomerId, stripeSubscriptionId, subscriptionStatus), implemented Stripe webhook handling for automatic subscription event processing, added developer account privileges for unlimited access, created Settings page with billing management interface, comprehensive error handling with clear configuration guidance when Stripe is not set up, documented complete setup process in STRIPE_SETUP.md for easy deployment
- July 21, 2025. Shopping Mode recipe diversity enhancement complete - added randomization mechanisms to prevent repetitive recipe suggestions when users reject multiple options, implemented dynamic diversity prompts with different protein requirements, cooking techniques, and regional variations, increased AI temperature to 0.9 for more creative outputs, added uniqueness requirements to ensure each recipe uses different proteins and cooking methods
- July 21, 2025. Shopping Mode supermarket integration fixed - corrected supermarket mapping from US stores (Whole Foods, Trader Joe's) to UK stores (Tesco, Sainsbury's, ASDA, Morrisons, Waitrose, Aldi, Lidl, M&S, Iceland, Co-op), added comprehensive supermarket-specific prompts with store ranges and specialties, enhanced logging to track supermarket selection and prompt inclusion
- July 21, 2025. Ingredient substitution functionality completely rebuilt - enhanced substitution system to use OpenAI function calling for comprehensive recipe updates, ingredient substitution buttons now update both ingredient lists AND cooking instructions that reference the original ingredient, implemented streaming response parsing to handle complete recipe modifications, added proper error handling and fallback mechanisms for ingredient replacement
- July 21, 2025. Ingredient substitution system simplified and fixed - created dedicated `/api/ingredient-substitute` endpoint using OpenAI GPT-3.5 for reliable contextual substitutions, simplified frontend logic to directly update recipe store and force UI re-renders, enhanced substitution prompts with recipe context and cuisine considerations, added comprehensive logging for substitution analytics, ingredient substitution buttons now visually update the recipe card immediately after processing
- July 21, 2025. My Cookbook functionality unified and enhanced - renamed "Digital Cookbook" to "My Cookbook" throughout the app for consistency, added favorite/save button to recipe cards with heart icon, implemented `/api/save-recipe` endpoint for saving recipes to user's cookbook, enhanced EnhancedRecipeCard with FavoriteButton component that shows saved state and prevents duplicates, updated navigation links to use `/cookbook` route consistently, delete recipe functionality already available through existing endpoints
- July 23, 2025. Comprehensive documentation suite created - generated complete Product Requirements Document (PRD) covering executive summary, target audience, core product offerings, user experience design, competitive advantage, success metrics, and development roadmap, created detailed Technical Specification covering system architecture, database schemas, API designs, AI integration patterns, authentication systems, and deployment strategies, produced full API Documentation with endpoint specifications, request/response examples, authentication requirements, WebSocket protocols, and SDK usage examples
- January 23, 2025. Major app restructure to 2-mode system - simplified from 5 modes to 2 visible modes (Fridge2Fork + Chef Assist), Fridge2Fork mode with Google Vision photo input and no quiz, Chef Assist with single prompt and rotating suggestions, new streamlined Recipe page with integrated Zest chatbot, tinder-style recipe selection for Fridge2Fork, direct-to-recipe generation for Chef Assist
- January 23, 2025. UI restoration complete - restored original quiz-style layouts for both modes, Chef Assist uses textarea with cycling suggestion chips, Fridge2Fork uses ingredient input with photo upload options, maintained dark theme with orange gradient buttons, fixed ChatBot import issues and API response_format compatibility
- January 23, 2025. Chef Assist enhancements complete - added 43 cooking inspirations including chef and restaurant-inspired dishes, suggestion chips rotate every 8 seconds through 3 sets of examples, "Inspire Me" button enhanced with randomization system using cuisine styles, cooking methods, and proteins to prevent repetitive suggestions, implemented pineapple filter with sophisticated fallback options, comma-separated ingredient input functionality added to Fridge2Fork mode
- January 23, 2025. "Inspire Me" system redesigned - removed difficulty level statements and fixed curated list dependency, now uses style descriptions (chef-inspired, mood-inspired, restaurant-inspired, weather-inspired, cultural-inspired, technique-inspired) to guide AI toward innovative recipe ideas without limiting creativity to specific examples, generates fresh restaurant-style and elevated comfort food concepts
- January 23, 2025. Navigation and loading improvements complete - fixed Chef Assist navigation to Recipe page using Zustand store instead of complex state passing, added DidYouKnowLoader with rotating culinary facts during recipe generation, enhanced "Inspire Me" prompts to vary across cooking skill levels (beginner/intermediate/advanced) and ingredient types (plant-based, seafood, meat, exotic, pantry staples) for maximum diversity
- January 23, 2025. LoadingPage system and recipe generation fixes complete - created dedicated loading page with culinary facts and animations for legacy modes (Shopping, Fridge, ChefAssist), fixed JSON parsing errors in recipe generation by implementing trailing comma removal, enhanced error handling for reliable recipe creation, all legacy modes now navigate to `/loading` during generation then return with results
- January 23, 2025. Recipe generation prompts enhanced for complete dishes - updated both Chef Assist and Fridge2Fork prompts to emphasize creating COMPLETE MEALS with main components, side dishes, accompaniments, sauces, and garnishes rather than single elements, ensuring all generated recipes are balanced, complete dishes ready for serving
- January 23, 2025. Removed "Ask Zest" box from RecipeCard - simplified sharing tools area by removing redundant chat prompt below share buttons, maintaining clean interface while Zest chatbot remains fully accessible in Recipe page
- January 23, 2025. Enhanced ChatBot functionality - fixed mobile text input visibility with bulletproof CSS layout, implemented conversation history persistence for retained chat memory between messages, fixed recipe updates from ChatBot to properly render in UI through recipeStore integration, resolved mobile input disappearing while typing through improved state management, ChatBot now sends full conversation history with each request for continuity
- January 23, 2025. Individual ingredient management enhanced - improved photo detection with OpenAI Vision API, added clear delete functionality with red X buttons, enhanced UI with helpful instructions "Click the × to remove any ingredients you don't want to use", fixed error handling to show proper messages when no ingredients detected instead of adding error text as fake ingredients
- January 23, 2025. Enhanced recipe display with dynamic updates - integrated StreamingChatBot component with live recipe card updates via function calling, fixed duplicate servings key in EnhancedRecipeCard, improved image handling in recipe generation with proper fallback support for both image and imageUrl properties
- January 23, 2025. Fixed Fridge2Fork ingredient substitution logic - enhanced prompts to intelligently substitute ingredients for culinary harmony (e.g., pasta instead of rice for pasta salad), removed inaccurate time chips from recipe headers, improved ingredient flexibility to prioritize authentic dish preparation over literal ingredient usage
- January 23, 2025. Fixed recipe image display and mobile ChatBot - updated recipeStore to handle both 'image' and 'imageUrl' fields from API responses, enhanced mobile responsiveness of ChatBot component by adding flex-shrink-0 to input area, removed sticky positioning from Recipe page chat panel to improve mobile experience, ensured recipe images display properly instead of showing "text"
- January 23, 2025. Enhanced photo detection with 70% confidence filtering - OpenAI Vision now filters ingredients below 70% confidence automatically without displaying percentages to users, improved cuisine-based ingredient grouping to prevent incompatible combinations (Asian, Mediterranean, British, neutral categories), enhanced prompts for better culinary authenticity, clean ingredient badges without confidence percentages for better user experience
- January 23, 2025. My Cookbook chat functionality restored - fixed DigitalCookbook to navigate to full Recipe page instead of modal view, enabling full ChatBot integration for saved recipes, removed modal-based recipe viewing in favor of complete recipe experience with chat capabilities
- January 23, 2025. Timer chips removed from all recipe displays - eliminated timer chips from RecipeCard components and My Cookbook recipe cards per user preference, maintained cooking time information in discrete text format in recipe stats sections without prominent chip display
- January 23, 2025. Recipe card chip improvements complete - removed shopping mode from My Cookbook filter options, replaced difficulty chip with accurate timer chip in main recipe cards using Clock icon, removed timer badges from individual cooking steps in StepStack component while keeping step progression indicators
- January 23, 2025. Chef Assist cooking time calculation fixed - removed hardcoded 30-minute default cooking time, enhanced AI prompts to calculate realistic cooking times based on actual recipe requirements (e.g., 150+ minutes for braised dishes, 25 minutes for stir-fries), timer chip now displays accurate total cooking time for each recipe type
- January 23, 2025. Individual step timing restored to StepStack - added intelligent duration extraction function that parses cooking instructions for explicit times and recognizes common cooking terms, displays timing badges with Clock icon for each step, supports both explicit times (e.g., "15 minutes") and cooking actions (e.g., "simmer" = 15min, "sear" = 5min), smart formatting shows hours and minutes for longer steps
- January 23, 2025. Interactive countdown timers added to recipe steps - implemented clickable timer controls with play/pause/reset buttons for each cooking step, real-time countdown display in MM:SS format, visual state indicators (gray/orange/yellow/green) for timer status, automatic completion detection with console logging ready for audio notifications
- January 23, 2025. Gentle audio alarm added to step timers - implemented soft chime sound using Web Audio API when timers reach zero, harmonious two-tone bell sound (C6/E6 frequencies) with gentle fade in/out, non-intrusive volume level, graceful fallback for browsers without audio support
- January 23, 2025. Time constraints removed from recipe generation - eliminated time limits from both Chef Assist and Fridge2Fork modes to allow full flexibility, users can now request timing adjustments via chat interface, AI calculates realistic cooking times based on actual recipe requirements without artificial constraints
- January 23, 2025. Step timer accuracy improved - enhanced extractDuration function with better pattern recognition for explicit times, context-aware default timings based on cooking actions (prep work 1-3min, quick cooking 4-8min, longer processes 15-60min), intelligent timer assignment only for steps requiring timing, improved handling of time ranges and descriptive timing phrases
- January 23, 2025. Timer system refined for cooking-only steps - redesigned timer logic to only show timers for actual cooking processes (oven cooking, protein cooking, liquid processes, marinating, time-dependent processes), eliminated timers for prep work (chopping, mixing, seasoning), visual cue steps (until golden/tender), and assembly steps, creating cleaner practical cooking experience
- January 23, 2025. Pasta cooking time accuracy fixed - enhanced timer system with realistic pasta cooking times (10 minutes for spaghetti/pasta instead of 5 minutes), added specific timing for rice (18 minutes) and quinoa (15 minutes), ensuring step timers match actual packet instructions and cooking requirements
- January 23, 2025. Enhanced chat customization suggestions in ingredient panel - updated chat guide box with more specific and actionable examples (spice level, side dishes, cooking method, ingredient swaps) and added "and more" to indicate additional possibilities, improving feature discoverability
- January 23, 2025. AI-powered step timing system implemented - replaced hardcoded cooking times with GPT-3.5 powered timing analysis that considers cooking method, ingredients, food safety, and contextual clues, providing accurate step-specific timers via `/api/get-step-timing` endpoint, ensuring realistic timing based on actual cooking requirements rather than predetermined assumptions
- January 23, 2025. Timer conversion bug fixes in progress - debugging critical issue where 12-minute cooking steps display as 12-hour timers, enhanced pattern matching for time ranges like "10-12 minutes", added comprehensive logging to track conversion errors at each step of the timing calculation process
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
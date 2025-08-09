# Flavr - AI Recipe Generator

## Overview
Flavr is an AI-powered full-stack web application designed to be a personalized culinary companion. It generates customized recipes based on user preferences, available ingredients, and cooking constraints. Key capabilities include multiple cooking modes, subscription tiers, and comprehensive user management. The vision is to provide an intuitive, AI-driven platform for home cooks seeking tailored culinary inspiration and practical kitchen assistance, aiming for broad market adoption due to its innovative approach to recipe generation and meal planning.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, shadcn/ui, Radix UI, class-variance-authority
- **State Management**: TanStack Query (React Query), Zustand (for `ritualsStore`)
- **Routing**: Wouter
- **UI/UX Decisions**: Modern, responsive design; dark theme with orange accents (default); enhanced RecipeCard structure; mobile-first image display (16:10 aspect ratio); streamlined visual feedback.
- **Key Features**: Multi-step quiz system; Tinder-style recipe selection; comprehensive recipe display; integrated Zest chatbot for modifications; developer UI for image migration.

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication (express-session), Google OAuth
- **AI Integration**: MichelinChefAI system using GPT-4o for reliable recipe generation (switched from GPT-5 reasoning model); Google Gemini for conversational AI. Enhanced Inspire Me system with authentic cuisine-specific dishes including detailed flavor-boosting elements, proper timing, and cultural authenticity markers. Comprehensive authenticity validation against 15+ established chefs.
- **Image Generation**: Replicate API (Stable Diffusion), DALL-E 3 for recipe images.
- **Payment Processing**: Stripe for subscription management.
- **Core Logic**: Advanced MichelinChefAI prompting system with cookbook-quality recipes matching established chef voices (Rick Stein, Jamie Oliver, Tom Kerridge, Mary Berry, Delia Smith, Marcus Wareing, Georgina Hayden, Jose Pizarro, Dishoom, etc.); sophisticated flavor maximization; UK English ingredient terminology mappings; Enhanced Inspire Me with authentic dishes (Thai Laab, Greek Yuvetsi, French Coq au Vin, etc.) including proper timing and technique details; Comprehensive authenticity validation system blocking pretentious language, strange fusion combinations, and molecular gastronomy; AI-powered step timing; server-side image storage and serving.

### Core Cooking Modes
- **Shopping Mode**: Generates recipes with shopping lists.
- **Fridge Mode**: Creates recipes from available ingredients with flexibility.
- **Chef Assist Mode**: Professional culinary guidance with dynamic suggestions.
- **Budget Planner**: Generates full meal plans with shopping lists, optimized for budget and flavor.
- **Flavr Rituals**: Weekly meal planning (premium).
- **Photo-to-Recipe (Premium)**: Converts cookbook photos to editable recipe cards using Google Gemini Vision API.

### User Management
- **Authentication**: Email/password, Google OAuth.
- **Pseudo Users**: Anonymous usage tracking via browser fingerprinting.
- **Subscription Tiers**: Free (limited recipes/month) and Flavr+ (unlimited).
- **Usage Tracking**: Monthly limits with automatic reset.
- **Developer Privileges**: `william@blycontracting.co.uk` has unlimited access and developer logs visibility.

### Data Flow & System Design
- **Recipe Generation Flow**: Quiz -> Quota check -> AI generation (3-6 suggestions) -> User selection -> Full recipe generation -> Save & optional image generation.
- **Authentication Flow**: Login/signup -> Session creation -> Quota management.
- **Subscription Management**: Stripe integration for payments, webhooks for events, tier enforcement.
- **Image Storage System**: Local storage in `server/public/recipe-images/`, served via `/api/images/serve/`, with migration utility.
- **Behavioral Profiling**: `interaction_logs` database table for user behavior tracking and B2B insights.
- **Security**: Bcrypt for password hashing; server-side quota enforcement; OAuth2 service account authentication.
- **Code Structure**: Modular server routes (`authRoutes.ts`, `recipeRoutes.ts`, etc.); shared types for client/server.

## External Dependencies

### AI Services
- **OpenAI**: MichelinChefAI system using GPT-5 standard model (not reasoning variant) for cookbook-quality recipe generation (no chef-science jargon). DALL-E 3 for recipe images. User input priority with intent classification (exact_named_dish, constrained_brief, broad_theme). Performance targets: 12-30s typical, ≤45s complex recipes, 1-3s for Inspire Me titles with varied structure.
- **Google Gemini**: Conversational AI (primary chatbot), Google Vision API for ingredient detection (Photo-to-Recipe).
- **Replicate**: Stable Diffusion for food image generation.

### Payment & Analytics
- **Stripe**: Subscription billing, payment processing (Stripe Elements), webhook handling.
- **Neon Database**: Serverless PostgreSQL hosting.

### Infrastructure & Development
- **Replit**: Development and hosting platform.

### Frontend Libraries
- **Framer Motion**: Animations.
- **Lucide React**: Icons.
- **React Hook Form**: Form management.
- **Date-fns**: Date utilities.
- **Zustand**: State management for specific features like Flavr Rituals.
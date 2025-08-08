# AIJobSearchAgent Project Overview

## Project Description
AIJobSearchAgent is a Next.js-based AI-powered career success platform that helps users with job searching, resume optimization, interview preparation, and career advancement.

## Core Architecture
- **Frontend:** Next.js 15 with TypeScript and React 18
- **Styling:** Tailwind CSS with dark mode support
- **State Management:** Redux Toolkit with Redux Persist + Jotai for specific features
- **Authentication:** Firebase Auth
- **Database:** Firebase Firestore
- **AI Integration:** OpenAI API for resume enhancement and job matching
- **UI Components:** Custom components with Lucide React icons
- **Deployment:** Google Cloud Run with Docker

## Key Features
1. **Job Search & Listings** - Integrated job search with filtering and application tracking
2. **AI Resume Enhancement** - OpenAI-powered resume optimization and analysis
3. **Interview Preparation** - AI-powered mock interviews with video chat
4. **Dashboard** - Comprehensive user dashboard for managing applications and profile
5. **Profile Management** - Detailed user profiles with work experience and preferences

## Technology Stack
- Next.js 15 (App Router and Pages Router hybrid)
- TypeScript (strict mode)
- Tailwind CSS
- Firebase (Auth, Firestore)
- OpenAI API
- Redux Toolkit + Jotai
- Framer Motion (animations)
- React PDF (document generation)
- Daily.co (video chat for interviews)

## Project Structure
- `src/pages/` - Next.js pages (routing)
- `src/components/` - Reusable React components
- `src/services/` - API services and business logic
- `src/store/` - Redux slices and Jotai atoms
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions
- `src/types/` - TypeScript type definitions
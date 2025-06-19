# My Job Search Agent 🤖

An AI-powered job search application built with React, TypeScript, and Vite that helps users find, apply to, and manage job applications efficiently.

## 🚀 Features

- **AI-Enhanced Job Search**: Intelligent job matching based on user preferences
- **Resume Optimization**: AI-powered resume enhancement and template selection
- **Application Tracking**: Comprehensive dashboard to track job applications
- **Profile Management**: User profile creation and management
- **Authentication**: Secure login/registration with Firebase
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Real-time Updates**: Live application status tracking

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Authentication**: Firebase
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Phone Validation**: libphonenumber-js
- **Deployment**: Netlify

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control
- **Firebase account** (for authentication)

## ⚡ Quick Start

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/agilepartners-ai/MyJobSearchAgent.git

# Navigate to project directory
cd MyJobSearchAgent
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install


```

### 3. Environment Setup

Create a `.env` file in the root directory and add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_JSEARCH_API_KEY=Your jsearch api
VITE_JSEARCH_API_HOST=your host api
```

### 4. Run Development Server

```bash
# Start development server
npm run dev

# Or using yarn
yarn dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Build and Deployment

### Build for Production

```bash
# Create production build
npm run build

# Or using yarn
yarn build
```

### Preview Production Build

```bash
# Preview the production build locally
npm run preview

# Or using yarn
yarn preview
```

## 📁 Project Structure

```
MyJobSearchAgent/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── auth/         # Authentication components
│   │   ├── dashboard/    # Dashboard components
│   │   ├── forms/        # Form components
│   │   └── applications/ # Job application components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # External library configurations
│   ├── services/         # API and service functions
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── test/             # Test files
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── netlify.toml          # Netlify deployment configuration
```

## 🌿 Git Workflow & CLI Commands

### Branch Management

```bash
# Check current branch
git branch

# Create and switch to new feature branch
git checkout -b feature/your-feature-name

# Switch to existing branch
git checkout branch-name

# Create new branch from current branch
git branch new-branch-name

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name
```

### Basic Git Operations

```bash
# Check status
git status

# Add files to staging
git add .                    # Add all files
git add filename            # Add specific file
git add *.js               # Add all JS files

# Commit changes
git commit -m "Your commit message"

# Push to remote branch
git push origin branch-name

# Pull latest changes
git pull origin branch-name
# push from branch if errors 
git push --set-upstream origin branch-name

# Fetch all branches
git fetch --all
```

### Working with Feature Branches

```bash
# 1. Create feature branch
git checkout -b feature/job-search-enhancement

# 2. Make your changes and commit
git add .
git commit -m "feat: add AI-powered job matching algorithm"

# 3. Push feature branch to remote
git push origin feature/job-search-enhancement

# 4. Create Pull Request (via GitHub/GitLab interface)

# 5. After PR approval, merge to main
git checkout main
git pull origin main
git merge feature/job-search-enhancement

# 6. Push updated main
git push origin main

# 7. Delete feature branch (optional)
git branch -d feature/job-search-enhancement
git push origin --delete feature/job-search-enhancement
```

### Deployment to Main Branch

```bash
# Complete workflow for pushing to main
git pull origin main
git merge your-feature-branch
git push 


## 🔄 Application Workflow

```mermaid
graph TD
    A[User Registration] --> B[Email Verification]
    B --> C[Profile Setup]
    C --> D[Job Preferences]
    D --> E[Dashboard Access]
    
    E --> F[Job Search]
    E --> G[Resume Upload]
    E --> H[Application Tracking]
    
    F --> I[AI Job Matching]
    I --> J[Job Application]
    J --> K[Application Status]
    K --> L[Interview Scheduling]
    
    G --> M[AI Resume Enhancement]
    M --> N[Template Selection]
    N --> O[Optimized Resume]
    
    H --> P[Application List]
    P --> Q[Status Updates]
    Q --> R[Analytics Dashboard]
    
    style A fill:#e1f5fe
    style E fill:#e8f5e8
    style J fill:#fff3e0
    style O fill:#f3e5f5
```



## 🔄 Git Branching Strategy

```mermaid
gitgraph
    commit id: "Initial commit"
    branch feature/auth
    checkout feature/auth
    commit id: "Add authentication"
    commit id: "Add user registration"
    checkout main
    merge feature/auth
    
    branch feature/dashboard
    checkout feature/dashboard
    commit id: "Create dashboard"
    commit id: "Add job search"
    checkout main
    merge feature/dashboard
    
    branch feature/ai-enhancement
    checkout feature/ai-enhancement
    commit id: "Add AI features"
    checkout main
    merge feature/ai-enhancement
    
    commit id: "Release v1.0.0"
```

## 🧪 Testing

```bash
# Run tests (when configured)
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## 🔍 Debugging

```bash
# Start with debugging enabled
npm run dev -- --debug

# Check for TypeScript errors
npx tsc --noEmit

# Analyze bundle size
npm run build -- --analyze
```

## 🚀 Performance Optimization

- **Code Splitting**: Implemented with React.lazy()
- **Image Optimization**: WebP format with fallbacks
- **Bundle Analysis**: Use `npm run build -- --analyze`
- **Caching**: Service worker for offline capabilities
- **Minification**: Automatic with Vite build

## 🔒 Security

- **Environment Variables**: All sensitive data in `.env`
- **Firebase Security Rules**: Configured for user data protection
- **HTTPS**: Enforced in production
- **Content Security Policy**: Configured in Netlify
- **Input Validation**: Zod schema validation

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed description
3. Include error logs and environment details

## 🔮 Future Enhancements

- [ ] AI-powered interview preparation
- [ ] Salary negotiation assistant
- [ ] Company culture matching
- [ ] Network analysis and recommendations
- [ ] Mobile application
- [ ] LinkedIn integration
- [ ] Email automation for follow-ups

---

**Happy Job Hunting!** 🎯

# Technology Stack

## Programming Languages
- **JavaScript**: Primary language for frontend and serverless functions
- **JSX**: React component markup
- **CSS**: Styling (no preprocessor)
- **HTML**: Base template

## Core Framework & Libraries

### Frontend
- **React**: 19.2.0 - UI framework
- **React DOM**: 19.2.0 - React rendering
- **react-calendar**: 6.0.0 - Calendar component for date selection
- **react-scripts**: 5.0.1 - Create React App build tooling

### Backend Services
- **Firebase**: 12.4.0 - Authentication and Firestore database
- **Supabase**: 2.76.1 - Additional backend capabilities

### Testing
- **@testing-library/react**: 16.3.0 - React component testing
- **@testing-library/jest-dom**: 6.9.1 - Jest DOM matchers
- **@testing-library/user-event**: 13.5.0 - User interaction simulation
- **@testing-library/dom**: 10.4.1 - DOM testing utilities

### Utilities
- **web-vitals**: 2.1.4 - Performance monitoring

## Build System
- **Create React App (CRA)**: Standard React build configuration
- **Webpack**: Bundled via react-scripts
- **Babel**: Transpilation via react-scripts
- **ESLint**: Code linting with react-app config

## Development Commands

```bash
# Start development server
npm start

# Run tests in watch mode
npm test

# Create production build
npm run build

# Deploy to GitHub Pages
npm run deploy

# Eject from CRA (irreversible)
npm run eject
```

## Deployment

### Platform
- **Vercel**: Primary hosting platform
- **GitHub Pages**: Alternative deployment target

### Configuration
- Custom build command with PUBLIC_URL override
- API routes under /api/* path
- SPA routing with index.html fallback
- CORS headers for cross-origin requests

## Browser Support

### Production
- >0.2% market share
- Not dead browsers
- Excludes Opera Mini

### Development
- Latest Chrome
- Latest Firefox
- Latest Safari

## Environment Requirements
- Node.js (version compatible with React 19)
- npm or yarn package manager
- Firebase project with Firestore enabled
- Vercel account for deployment (optional)

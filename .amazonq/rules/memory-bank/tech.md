# Technology Stack

## Programming Languages
- **JavaScript**: Primary language for React application
- **JSX**: React component markup
- **CSS**: Styling (App.css, index.css)
- **HTML**: Template (public/index.html)

## Frontend Framework
- **React**: v19.2.0
  - React DOM v19.2.0
  - Functional components
  - Hooks-based state management
- **react-scripts**: v5.0.1 (Create React App tooling)
- **react-calendar**: v6.0.0 (Date selection UI)

## Backend Services
- **Firebase**: v12.4.0
  - Firestore Database for data persistence
  - Real-time synchronization
  - Cloud-based storage
- **Supabase**: v2.76.1 (Alternative backend option)

## Build System
- **Create React App**: React application scaffolding
- **react-scripts**: Build, test, and development server
- **npm**: Package management

## Testing
- **@testing-library/react**: v16.3.0
- **@testing-library/jest-dom**: v6.9.1
- **@testing-library/user-event**: v13.5.0
- **@testing-library/dom**: v10.4.1
- **Jest**: Test runner (via react-scripts)

## Deployment
- **Vercel**: Primary hosting platform
  - Serverless functions support
  - Automatic builds from git
  - Custom headers configuration
- **GitHub Pages**: Alternative deployment (gh-pages v6.3.0)

## Development Commands

### Start Development Server
```bash
npm start
```
Runs app on http://localhost:3000 with hot reload

### Build Production Bundle
```bash
npm run build
```
Creates optimized production build in `build/` directory

### Run Tests
```bash
npm test
```
Launches test runner in interactive watch mode

### Deploy to GitHub Pages
```bash
npm run deploy
```
Builds and deploys to gh-pages branch

## Configuration Files
- **package.json**: Dependencies, scripts, and project metadata
- **vercel.json**: Vercel deployment configuration
  - Build commands
  - Output directory
  - Headers and rewrites
- **.gitignore**: Version control exclusions
- **src/firebase.js**: Firebase project configuration

## Browser Support
### Production
- >0.2% market share
- Not dead browsers
- Excludes Opera Mini

### Development
- Latest Chrome, Firefox, Safari versions

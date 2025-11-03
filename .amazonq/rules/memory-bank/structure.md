# Project Structure

## Directory Organization

```
simpleone/
├── api/                    # Serverless API functions
│   └── toggl.js           # Toggl time tracking integration
├── public/                 # Static assets and HTML template
│   ├── data.json          # Static data files
│   ├── index.html         # Main HTML template
│   └── [icons/manifests]  # PWA assets
├── src/                    # React application source
│   ├── App.js             # Main application component
│   ├── App.css            # Application styles
│   ├── firebase.js        # Firebase configuration
│   ├── index.js           # React entry point
│   └── [test files]       # Testing setup
└── [config files]          # Build and deployment configs
```

## Core Components

### Frontend (src/)
- **App.js**: Main application component containing all task management logic, UI rendering, and state management
- **firebase.js**: Firebase/Firestore configuration and initialization
- **index.js**: React application entry point and root rendering
- **App.css**: Complete application styling including task hierarchy, time tracking UI, and responsive design

### Backend (api/)
- **toggl.js**: Serverless function for Toggl API integration, handles time entry retrieval and processing

### Configuration
- **package.json**: Dependencies (React 19, Firebase, Supabase, react-calendar)
- **vercel.json**: Vercel deployment configuration with API routing and CORS headers
- **.gitignore**: Standard React/Node exclusions

## Architectural Patterns

### Single-Page Application (SPA)
- React-based frontend with component-driven architecture
- Client-side routing and state management
- All core logic contained in main App component

### Backend-as-a-Service (BaaS)
- Firebase Firestore for real-time database
- Supabase for additional backend services
- Serverless functions for external API integration

### Real-time Synchronization
- Firestore listeners for live data updates
- Automatic state synchronization across devices
- Event-driven data flow

### Deployment Architecture
- Vercel hosting for frontend and serverless functions
- API routes under /api/* path
- SPA routing with fallback to index.html
- Cross-origin policies configured for Firebase integration

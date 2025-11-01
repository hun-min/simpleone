# Project Structure

## Directory Organization

```
simpleone/
├── api/                    # Serverless API functions
│   └── toggl.js           # Toggl integration endpoint
├── public/                 # Static assets and HTML template
│   ├── data.json          # Static data file
│   ├── index.html         # Main HTML template
│   └── [icons/manifests]  # PWA assets
├── src/                    # React application source
│   ├── App.js             # Main application component
│   ├── App.css            # Application styles
│   ├── firebase.js        # Firebase configuration
│   ├── index.js           # React entry point
│   └── [test files]       # Testing utilities
├── .amazonq/              # Amazon Q configuration
│   └── rules/             # Project rules and memory bank
├── package.json           # Dependencies and scripts
├── vercel.json            # Vercel deployment config
└── README.md              # Setup instructions
```

## Core Components

### Application Layer (src/)
- **App.js**: Main React component containing all application logic
  - Task management state and operations
  - Time tracking functionality
  - Firebase integration for data persistence
  - UI rendering and event handling
  - Calendar integration for date selection

- **firebase.js**: Firebase/Firestore configuration module
  - Database connection setup
  - Authentication configuration
  - Firestore instance initialization

- **index.js**: React application bootstrap
  - Root component rendering
  - React DOM initialization

### API Layer (api/)
- **toggl.js**: Serverless function for Toggl time tracking integration
  - External API proxy endpoint
  - Deployed as Vercel serverless function

### Static Assets (public/)
- HTML template and PWA configuration
- Icons and manifest files
- Static data files

## Architectural Patterns

### Single Page Application (SPA)
- React-based client-side application
- Single main component (App.js) architecture
- Client-side state management

### Backend-as-a-Service (BaaS)
- Firebase Firestore for data persistence
- Real-time database synchronization
- Serverless API functions via Vercel

### Data Flow
1. User interactions in App.js
2. State updates trigger Firebase operations
3. Firestore real-time listeners update UI
4. Date-based data organization in Firestore collections

### Deployment Architecture
- Vercel hosting for static React build
- Serverless functions for API endpoints
- Firebase for database and real-time sync
- Cross-Origin-Opener-Policy headers for security

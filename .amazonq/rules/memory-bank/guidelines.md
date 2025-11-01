# Development Guidelines

## Code Quality Standards

### File Structure
- Single-component architecture: Main application logic consolidated in App.js
- Separate configuration files for external services (firebase.js)
- API endpoints isolated in api/ directory as serverless functions
- Standard Create React App structure maintained

### Naming Conventions
- **Variables**: camelCase for all state variables and functions
  - State: `currentDate`, `activeTimers`, `timerSeconds`, `selectedTasks`
  - Functions: `addTask`, `deleteTask`, `updateTask`, `toggleTimer`
- **Components**: PascalCase for React components (App, Calendar)
- **Constants**: camelCase for configuration objects (firebaseConfig)
- **Files**: camelCase for JavaScript files (firebase.js, reportWebVitals.js)
- **CSS Classes**: kebab-case (task-row, popup-overlay, timeline-view)

### Code Formatting
- **Line Endings**: CRLF (Windows style) - consistent across all files
- **Indentation**: 2 spaces (no tabs)
- **Semicolons**: Always used at statement ends
- **Quotes**: Single quotes for imports and strings, double quotes in JSX attributes
- **Destructuring**: Used for imports and function parameters
  ```javascript
  import { useState, useEffect } from 'react';
  const { method, body, query } = req;
  ```

### Comments and Documentation
- Minimal inline comments - code should be self-documenting
- Korean language comments when present for user-facing messages
- No JSDoc or function documentation headers
- Comments used sparingly for complex logic clarification

## Semantic Patterns

### State Management
- **React Hooks Pattern**: Extensive use of useState and useEffect
  ```javascript
  const [dates, setDates] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  ```
- **LocalStorage Persistence**: State initialized from localStorage with fallbacks
  ```javascript
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  ```
- **Derived State**: Computed values from existing state (dateKey, stats)

### Data Flow Patterns
- **Immutable Updates**: Always create new objects/arrays for state updates
  ```javascript
  const newDates = { ...dates };
  setDates(newDates);
  ```
- **Deep Cloning**: JSON.parse(JSON.stringify()) for history snapshots
- **Nested State Updates**: Traverse object paths to update deeply nested data

### Event Handling
- **Keyboard Shortcuts**: Comprehensive keyboard navigation and shortcuts
  - Tab/Shift+Tab for indentation
  - Enter for new tasks, Shift+Enter for subtasks
  - Arrow keys for navigation
  - Ctrl+Z/Y for undo/redo
  - Alt+Arrow for reordering
  - Ctrl+1/2/3 for view modes
- **Event Prevention**: e.preventDefault() and e.stopPropagation() used extensively
- **Focus Management**: requestAnimationFrame for reliable focus control
  ```javascript
  requestAnimationFrame(() => {
    const input = document.querySelector(`input[data-task-id="${taskId}"]`);
    if (input) input.focus();
  });
  ```

### Firebase Integration
- **Configuration**: Centralized in firebase.js with named exports
  ```javascript
  export const auth = getAuth(app);
  export const db = getFirestore(app);
  export const googleProvider = new GoogleAuthProvider();
  ```
- **Authentication**: Google OAuth with popup flow
- **Firestore Operations**: 
  - doc(), setDoc(), getDoc() for document operations
  - onSnapshot() for real-time listeners
  - merge: true for partial updates
  - deleteField() for field removal
- **Debounced Sync**: 3-second timeout before auto-saving to Firebase
  ```javascript
  const timer = setTimeout(() => {
    setDoc(docRef, { workspaces, togglToken }, { merge: true });
  }, 3000);
  ```

### API Patterns
- **Serverless Functions**: Vercel-style export default handler
  ```javascript
  export default async function handler(req, res) {
    const { method, body, query } = req;
    // Handle request
  }
  ```
- **Basic Auth**: Buffer.from().toString('base64') for API authentication
- **Error Handling**: Try-catch with status code propagation
- **Proxy Pattern**: API routes proxy external services (Toggl)

### UI Patterns
- **Popup Overlays**: Modal dialogs with overlay click-to-close
  ```javascript
  <div className="popup-overlay" onClick={() => setPopup(null)}>
    <div className="popup" onClick={(e) => e.stopPropagation()}>
  ```
- **Conditional Rendering**: Ternary operators and && for conditional UI
- **Dynamic Styling**: Inline styles with computed values
- **CSS Classes**: Template literals for dynamic class names
  ```javascript
  className={`task-row ${isSelected ? 'selected' : ''}`}
  ```

### Time Handling
- **Format Function**: Custom formatTime() for human-readable durations
  ```javascript
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };
  ```
- **Date Keys**: YYYY-MM-DD format strings for date-based indexing
- **ISO Strings**: toISOString() for timestamp storage

### Drag and Drop
- **Native HTML5 API**: draggable attribute with event handlers
- **Touch Support**: Separate touch event handlers for mobile
- **Visual Feedback**: CSS classes for drag states (dragging, drag-over)
- **Position Calculation**: getBoundingClientRect() for drop position

### Multi-Selection
- **Shift-Click**: Range selection between last and current
- **Ctrl/Cmd-Click**: Toggle individual selection
- **Escape**: Clear all selections
- **Batch Operations**: Apply operations to all selected items

## Common Idioms

### Array Operations
```javascript
// Find and update
const task = tasks.find(t => t.id === taskId);
const idx = tasks.findIndex(t => t.id === taskId);

// Splice for insertion/deletion
tasks.splice(index + 1, 0, newTask);
tasks.splice(index, 1);

// Array swapping
[tasks[idx - 1], tasks[idx]] = [tasks[idx], tasks[idx - 1]];

// Filtering
const filtered = tasks.filter(t => t.completed);
```

### Object Spread
```javascript
// Shallow copy
const newDates = { ...dates };
const newTask = { ...task, completed: true };

// Nested updates
const ws = { ...workspaces };
ws[currentWorkspace].dates = dates;
```

### Async/Await
```javascript
// Firebase operations
const docSnap = await getDoc(docRef);
await setDoc(docRef, data, { merge: true });

// Fetch API
const response = await fetch(url, options);
const data = await response.json();
```

### Optional Chaining
```javascript
// Safe property access
task.children?.map(child => renderTask(child));
timerLogs[dateKey]?.filter(log => log.taskName === task.text);
```

## Testing Standards

### Test Framework
- React Testing Library for component testing
- Jest as test runner (via react-scripts)
- Minimal test coverage - basic smoke tests only

### Test Structure
```javascript
test('description', () => {
  render(<Component />);
  const element = screen.getByText(/pattern/i);
  expect(element).toBeInTheDocument();
});
```

## Performance Considerations

### Optimization Techniques
- **Debouncing**: 3-second delay for Firebase auto-save
- **Interval Cleanup**: Clear intervals in useEffect cleanup
- **Conditional Effects**: Early returns in useEffect when conditions not met
- **Minimal Re-renders**: Careful state updates to avoid cascading renders

### Memory Management
- **Cleanup Functions**: Return cleanup from useEffect
- **Event Listener Removal**: removeEventListener in cleanup
- **Timer Clearing**: clearTimeout/clearInterval in cleanup

## Security Practices

### API Security
- **Token Validation**: Check for required tokens before processing
- **Error Handling**: Don't expose internal errors to client
- **CORS Headers**: Configured in vercel.json

### Data Validation
- **Input Sanitization**: Validate user inputs before processing
- **Type Checking**: Check types before operations (instanceof Function)
- **Boundary Checks**: Min/max validation for numeric inputs

## Deployment Configuration

### Vercel Setup
- Custom build command with PUBLIC_URL override
- Header configuration for Cross-Origin-Opener-Policy
- API route rewrites for serverless functions
- SPA fallback to index.html

### Environment
- Firebase credentials in source (not environment variables)
- LocalStorage for client-side persistence
- No .env file usage in current implementation

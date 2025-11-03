# Development Guidelines

## Code Quality Standards

### File Structure
- Single-component architecture: Main application logic consolidated in App.js (5/5 files follow this pattern)
- Separate configuration files: Firebase config isolated in firebase.js (5/5 files)
- Serverless functions in /api directory for external integrations (1/5 files)

### Naming Conventions
- **Variables**: camelCase for all state variables and functions
  - Examples: `currentDate`, `activeTimers`, `timerSeconds`, `showCalendar`
- **Components**: PascalCase for React components
  - Examples: `App`, `Calendar`
- **Constants**: camelCase for configuration objects
  - Example: `firebaseConfig`
- **Event Handlers**: Prefix with "handle" for event handler functions
  - Examples: `handleKeyDown`, `handleDragStart`, `handleTouchMove`, `handleFirebaseLogin`
- **Boolean States**: Descriptive names with "is", "show", "use" prefixes
  - Examples: `isDragging`, `showCalendar`, `useFirebase`, `isSyncing`

### Code Formatting
- **Indentation**: 2 spaces (consistent across all files)
- **Line Endings**: CRLF (Windows style - \r\n)
- **String Quotes**: Single quotes for JavaScript strings, double quotes for JSX attributes
- **Semicolons**: Always use semicolons at statement ends (5/5 files)
- **Spacing**: Space after keywords (if, for, while), no space before function parentheses

## Semantic Patterns

### State Management Pattern
All state managed with React hooks in single component:

```javascript
const [dates, setDates] = useState({});
const [currentDate, setCurrentDate] = useState(new Date());
const [activeTimers, setActiveTimers] = useState({});
```

Initialize state from localStorage with fallback:

```javascript
const [darkMode, setDarkMode] = useState(() => {
  const saved = localStorage.getItem('darkMode');
  return saved !== null ? JSON.parse(saved) : true;
});
```

### Effect Hooks Pattern
Sync state to localStorage on changes:

```javascript
useEffect(() => {
  localStorage.setItem('darkMode', JSON.stringify(darkMode));
  document.body.className = darkMode ? 'dark-mode' : 'light-mode';
}, [darkMode]);
```

Cleanup pattern for event listeners:

```javascript
useEffect(() => {
  window.addEventListener('keydown', handleGlobalKeyDown, true);
  return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
}, []);
```

Debounced Firebase sync with timeout cleanup:

```javascript
useEffect(() => {
  if (!user || !useFirebase) return;
  
  const timer = setTimeout(() => {
    setIsSyncing(true);
    setDoc(docRef, { workspaces, togglToken }, { merge: true })
      .then(() => setIsSyncing(false))
      .catch(err => {
        console.error('Firebase 자동 저장 실패:', err);
        setIsSyncing(false);
      });
  }, 3000);
  
  return () => clearTimeout(timer);
}, [workspaces, user, useFirebase, togglToken]);
```

### Firebase Integration Pattern
Initialize Firebase services as named exports:

```javascript
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
```

Authentication state listener with real-time sync:

```javascript
const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    setUser({ id: firebaseUser.uid, email: firebaseUser.email });
    const docRef = doc(db, 'users', firebaseUser.uid);
    onSnapshot(docRef, (doc) => {
      // Real-time data sync
    });
  }
});
return () => unsubscribe();
```

### Serverless API Pattern
Export default async handler for Vercel:

```javascript
export default async function handler(req, res) {
  const { method, body, query } = req;
  
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }
  
  try {
    // API logic
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

Basic authentication with Buffer encoding:

```javascript
const auth = Buffer.from(`${token}:api_token`).toString('base64');
const headers = { 'Authorization': `Basic ${auth}` };
```

### Event Handling Pattern
Comprehensive keyboard navigation with preventDefault:

```javascript
const handleKeyDown = (e, dateKey, taskPath, taskIndex) => {
  if (e.altKey && e.key === 'ArrowUp') {
    e.preventDefault();
    moveTaskOrder(dateKey, currentTaskId, 'up');
    return;
  }
  // Multiple key combinations handled
};
```

Focus management with requestAnimationFrame:

```javascript
requestAnimationFrame(() => {
  const input = document.querySelector(`input[data-task-id="${newTask.id}"]`);
  if (input) input.focus();
});
```

### Drag and Drop Pattern
Touch and mouse drag support:

```javascript
const handleDragStart = (e, dateKey, taskPath) => {
  if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
    e.preventDefault();
    return;
  }
  e.dataTransfer.effectAllowed = 'move';
  setDraggedTask({ dateKey, taskPath });
};
```

### Data Persistence Pattern
Dual storage strategy (localStorage + Firebase):

```javascript
// Save to local state and localStorage
setDates(newDates);
localStorage.setItem('workspaces', JSON.stringify(ws));

// Auto-sync to Firebase with debounce (3 seconds)
// Handled by useEffect hook
```

### Conditional Rendering Pattern
Popup overlays with click-through prevention:

```javascript
{goalPopup && (
  <div className="popup-overlay" onClick={() => setGoalPopup(null)}>
    <div className="popup" onClick={(e) => e.stopPropagation()}>
      {/* Popup content */}
    </div>
  </div>
)}
```

### Time Formatting Pattern
Hierarchical time display (hours > minutes > seconds):

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

### Recursive Task Operations
Update tasks across all dates by name:

```javascript
Object.keys(newDates).forEach(date => {
  const updateTasksRecursive = (tasks) => {
    tasks.forEach(t => {
      if (t.text === taskName) {
        t.totalTime += seconds;
      }
      if (t.children) updateTasksRecursive(t.children);
    });
  };
  if (newDates[date]) updateTasksRecursive(newDates[date]);
});
```

## Testing Standards

### Test Structure
- Use @testing-library/react for component testing
- Basic smoke tests for component rendering
- Pattern: render → query → assert

```javascript
test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
```

## Error Handling

### User-Facing Errors
Alert dialogs for user feedback:

```javascript
try {
  // Operation
  alert('✅ 업로드 완료!');
} catch (error) {
  console.error('업로드 에러:', error);
  alert('❌ 업로드 실패: ' + error.message);
}
```

### API Error Handling
Log errors and provide fallback:

```javascript
const data = await response.json();
if (!response.ok) {
  console.error('Toggl API error:', data);
}
return res.status(response.status).json(data);
```

## Performance Optimization

### Dynamic Imports
Lazy load performance monitoring:

```javascript
if (onPerfEntry && onPerfEntry instanceof Function) {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    // Use metrics
  });
}
```

### Debouncing
3-second debounce for Firebase auto-save to reduce API calls

### Conditional Effects
Early return in useEffect to prevent unnecessary operations:

```javascript
useEffect(() => {
  if (!user || !useFirebase) return;
  // Firebase sync logic
}, [workspaces, user, useFirebase]);
```

## UI/UX Patterns

### Inline Editing
Direct input fields in task rows with data attributes for identification:

```javascript
<input
  type="text"
  value={task.text}
  onChange={(e) => updateTask(dateKey, currentPath, 'text', e.target.value)}
  data-task-id={task.id}
  placeholder="할 일"
/>
```

### Visual Feedback
- Loading indicators: `isSyncing` state with colored dot (●)
- Active states: CSS classes like `active`, `selected`, `dragging`
- Emoji icons for visual clarity: 🎯 (goal), ⏱️ (timer), 🗑️ (delete)

### Keyboard Shortcuts
- Ctrl+1/2/3: View mode switching
- Tab/Shift+Tab: Indent/outdent tasks
- Alt+↑↓: Move task order
- Ctrl+Z/Y: Undo/redo
- Enter: Add new task
- Shift+Enter: Add child task

## Localization

### Korean UI
All user-facing text in Korean:
- Button labels: "저장", "취소", "삭제"
- Messages: "불러오기 완료!", "로그인이 필요합니다."
- Placeholders: "할 일", "API Token"

## Security Practices

### Authentication Persistence
Use browserLocalPersistence for Firebase auth:

```javascript
setPersistence(auth, browserLocalPersistence);
```

### Token Storage
Store sensitive tokens in localStorage (client-side only):

```javascript
localStorage.setItem('togglToken', togglToken);
```

### API Security
Server-side token handling in serverless functions, never expose tokens in client code

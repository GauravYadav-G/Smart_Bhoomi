# ⏱️ Session Timeout Feature - 10 Minute Inactivity Auto-Logout

## Overview

The application now automatically logs out users after **10 minutes of inactivity** for security purposes. This prevents unauthorized access if a user leaves their device unattended.

---

## How It Works

### Timeline
```
User logs in
    ↓
0 min: Session starts (fresh 10-minute inactivity timer)
    ↓
User is inactive (no mouse/keyboard/touch activity)
    ↓
9 min: Warning dialog appears
    ↓
    User chooses:
    ├─ "Continue Session" → Timer resets, session continues
    └─ "Logout Now" → User is logged out
    ↓
10 min: If no action taken, automatic logout occurs
```

---

## Features

### 1️⃣ Automatic Inactivity Detection
Tracks user activity on these events:
- Mouse movements (`mousedown`)
- Keyboard input (`keydown`)
- Page scrolling (`scroll`)
- Touch events (`touchstart`)
- Clicks (`click`)

Any of these activities reset the inactivity timer.

### 2️⃣ Warning Dialog (at 9 minutes)
When 1 minute remains before timeout:
- A warning dialog appears automatically
- Shows countdown timer: `1:00` to `0:00`
- Visual progress bar
- Two options:
  - **"Continue Session"** → Resets timer, dialog closes
  - **"Logout Now"** → Immediate logout

### 3️⃣ Automatic Logout (at 10 minutes)
If user doesn't interact with warning:
- User is automatically logged out
- Redirected to login page
- Session data cleared from localStorage
- All timers cleaned up

---

## Configuration

### Timeout Duration
Located in `client/src/context/AuthContext.js`:

```javascript
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
```

To change timeout (example: 15 minutes):
```javascript
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
```

### Warning Time
The warning appears 1 minute before timeout:
```javascript
// In resetInactivityTimer function
warningTimerRef.current = setTimeout(() => {
  setSessionTimeoutWarning(true);
}, SESSION_TIMEOUT - 60000); // 1 minute before
```

To show warning earlier (example: 2 minutes before):
```javascript
}, SESSION_TIMEOUT - 120000); // 2 minutes before
```

---

## Technical Implementation

### Files Modified/Created

#### 1. `client/src/context/AuthContext.js`
- Added session timeout state management
- Added activity tracking with event listeners
- Implemented timer reset logic
- Created `extendSession()` and `resetInactivityTimer()` functions

**New exports:**
```javascript
sessionTimeoutWarning      // Boolean: is warning showing?
timeRemaining             // Number: milliseconds until logout
extendSession()           // Function: extend session, reset timers
SESSION_TIMEOUT           // Constant: 10 minutes in ms
```

#### 2. `client/src/components/SessionTimeoutWarning.js` (NEW)
- Material-UI dialog component
- Displays countdown timer
- Progress bar showing time remaining
- "Continue" and "Logout Now" buttons
- Only renders when timeout warning is active

#### 3. `client/src/App.js`
- Imported `SessionTimeoutWarning` component
- Added `<SessionTimeoutWarning />` to render
- Fixed missing `BlockchainProvider` wrapper

---

## Usage in Components

### Accessing Timeout Info in Any Component

```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { sessionTimeoutWarning, timeRemaining, extendSession, logout } = useAuth();
  
  return (
    <>
      {sessionTimeoutWarning && (
        <div>
          Time remaining: {Math.floor(timeRemaining / 1000)}s
          <button onClick={extendSession}>Keep Me Logged In</button>
        </div>
      )}
    </>
  );
}
```

### Programmatically Extend Session

```javascript
const { extendSession } = useAuth();

const handleImportantAction = () => {
  // Do something important
  extendSession(); // Reset the inactivity timer
};
```

---

## Security Benefits

✅ **Prevents Unauthorized Access**
- Unattended devices auto-logout after inactivity
- Reduces risk of data breach

✅ **User-Friendly Warning**
- 1-minute warning gives users time to save work
- Clear countdown shows time remaining
- Option to extend session without re-login

✅ **Server-Side Complements Client-Side**
- JWT tokens expire separately on server
- Both client and server enforce security

✅ **Cleans Up Resources**
- Timers cleared on logout
- Event listeners removed
- No memory leaks

---

## Testing

### Manual Test Steps

1. **Login to application**
   - Note the time: `12:00 PM`

2. **Wait 9 minutes without activity**
   - Don't move mouse
   - Don't type
   - Don't scroll
   - At 9 minutes mark, warning should appear

3. **Verify Warning Dialog**
   - Shows countdown timer
   - Progress bar visible
   - Shows "1:00" and counts down to "0:00"

4. **Test "Continue Session"**
   - Click "Continue Session" button
   - Dialog closes
   - Timer resets to 10 minutes
   - Can continue using app

5. **Test "Logout Now"**
   - Wait for warning again
   - Click "Logout Now"
   - Redirected to login page
   - Must login again

6. **Test Activity Reset**
   - Login
   - Wait 5 minutes
   - Move mouse (or type, scroll)
   - Timer resets to 10 minutes
   - No warning should appear until 9 more minutes pass

---

## Troubleshooting

### Warning Never Appears
- Check browser console for errors
- Verify `SESSION_TIMEOUT` is set correctly
- Make sure you're not moving mouse/typing for 9 minutes straight

### Logout Happens Too Quickly
- Check `SESSION_TIMEOUT` value
- Check browser's background throttling isn't interfering

### Warning Dialog Keeps Reappearing
- This is normal if you dismiss and don't interact
- Every inactivity period triggers a new warning

---

## Browser Compatibility

✅ Works in all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Event listeners work across all platforms:
- Desktop (mouse/keyboard)
- Mobile/Tablet (touch)
- Hybrid devices (both)

---

## Future Enhancements

Possible improvements:
- [ ] Admin configuration panel for timeout duration
- [ ] Per-role timeout settings (e.g., admins = 30 min, users = 10 min)
- [ ] Sound alert before timeout
- [ ] Save unsaved form data before logout
- [ ] Option to extend timeout incrementally
- [ ] Server-side activity logging for audit

---

## References

- **AuthContext**: `client/src/context/AuthContext.js`
- **Warning Component**: `client/src/components/SessionTimeoutWarning.js`
- **Main App**: `client/src/App.js`
- **Material-UI Docs**: https://mui.com/

---

**Session timeout is now active! Users will be logged out after 10 minutes of inactivity with a friendly 1-minute warning.** ✅

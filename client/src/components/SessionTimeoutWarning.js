import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Box,
  Alert,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * Session Timeout Warning Component
 * Displays a warning when user has been inactive for 9 minutes
 * Auto-logs out after 10 minutes of inactivity
 */
export const SessionTimeoutWarning = () => {
  const { sessionTimeoutWarning, timeRemaining, extendSession, logout } = useAuth();
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    setMinutesRemaining(minutes);
    setSecondsRemaining(seconds);
  }, [timeRemaining]);

  if (!sessionTimeoutWarning) {
    return null;
  }

  const totalMinutes = 1; // Warning shows when 1 minute remains
  const percentageRemaining = (minutesRemaining * 60 + secondsRemaining) / 60;

  return (
    <Dialog open={sessionTimeoutWarning} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ff9800' }}>
        <WarningIcon />
        Session Expiring Soon
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your session will expire due to inactivity. Click "Continue" to remain logged in.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 'bold' }}>
            ⏱️ Time Remaining: {minutesRemaining}:{secondsRemaining.toString().padStart(2, '0')}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={percentageRemaining * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#f0f0f0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#ff9800',
              },
            }}
          />
        </Box>

        <Typography variant="body2" color="textSecondary">
          If you don't respond within 1 minute, you'll be automatically logged out for security.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ gap: 1, p: 2 }}>
        <Button
          onClick={logout}
          variant="outlined"
          color="error"
        >
          Logout Now
        </Button>
        <Button
          onClick={extendSession}
          variant="contained"
          color="primary"
          autoFocus
        >
          Continue Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionTimeoutWarning;

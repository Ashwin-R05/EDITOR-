import { useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { IncidentType } from '../types';

interface UseSecurityMonitorProps {
  roundId?: string;
  getCodeSnapshot: () => string;
  isEnabled: boolean;
  onLockSession: (incident: any) => void;
}

export function useSecurityMonitor({
  roundId,
  getCodeSnapshot,
  isEnabled,
  onLockSession,
}: UseSecurityMonitorProps) {
  const isReportingRef = useRef<boolean>(false);
  const lastViolationTimeRef = useRef<number>(0);

  const reportViolation = useCallback(
    async (type: IncidentType, description: string) => {
      if (!roundId || !isEnabled) return;

      const now = Date.now();
      // Throttle violation triggers within 3 seconds to prevent duplicate spam
      if (now - lastViolationTimeRef.current < 3000 || isReportingRef.current) {
        return;
      }

      lastViolationTimeRef.current = now;
      isReportingRef.current = true;

      try {
        const codeSnapshot = getCodeSnapshot();
        const res = await api.post('/security/incidents', {
          roundId,
          incidentType: type,
          description,
          codeSnapshot,
        });

        if (res.data?.incident) {
          onLockSession(res.data.incident);
        }
      } catch (err: any) {
        console.error('Failed to report security violation:', err);
        // Even if server request failed (e.g. participant already under review), trigger lock
        if (err.response?.status === 409 || err.response?.data?.incident) {
          onLockSession(err.response?.data?.incident || { incident_type: type, description });
        }
      } finally {
        isReportingRef.current = false;
      }
    },
    [roundId, isEnabled, getCodeSnapshot, onLockSession]
  );

  useEffect(() => {
    if (!isEnabled || !roundId) return;

    // 1. Block and detect Copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      reportViolation('COPY_ATTEMPT', 'Attempted to copy content from the coding arena');
    };

    // 2. Block and detect Paste
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      reportViolation('PASTE_ATTEMPT', 'Attempted to paste external content into the coding arena');
    };

    // 3. Block and detect Cut
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      reportViolation('CUT_ATTEMPT', 'Attempted to cut content from the coding arena');
    };

    // 4. Block and detect Right Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      reportViolation('RIGHT_CLICK', 'Right-click context menu triggered in the coding arena');
    };

    // 5. Block and detect suspicious Key Combinations
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Copy: Ctrl+C / Cmd+C
      if (isCtrlOrCmd && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        reportViolation('COPY_ATTEMPT', 'Attempted keyboard shortcut: Ctrl/Cmd + C (Copy)');
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if (isCtrlOrCmd && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        e.stopPropagation();
        reportViolation('PASTE_ATTEMPT', 'Attempted keyboard shortcut: Ctrl/Cmd + V (Paste)');
        return;
      }

      // Cut: Ctrl+X / Cmd+X
      if (isCtrlOrCmd && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        e.stopPropagation();
        reportViolation('CUT_ATTEMPT', 'Attempted keyboard shortcut: Ctrl/Cmd + X (Cut)');
        return;
      }

      // Developer Tools / Source Inspection shortcuts
      if (
        e.key === 'F12' ||
        (isCtrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (isCtrlOrCmd && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        reportViolation('TAB_SWITCH', 'Attempted to inspect page / open browser developer tools');
        return;
      }
    };

    // 6. Detect Tab Switch (Visibility Change)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('TAB_SWITCH', 'Participant switched away from the active coding tab');
      }
    };

    // 7. Detect Window Blur (Focus Lost / Switching to other windows)
    const handleWindowBlur = () => {
      // Small timeout to verify if document became hidden or window lost focus
      setTimeout(() => {
        if (document.hidden) {
          reportViolation('TAB_SWITCH', 'Participant switched to another browser tab');
        } else {
          reportViolation('WINDOW_BLUR', 'Focus left the coding arena window');
        }
      }, 100);
    };

    // Attach listeners with capture phase to guarantee interception before Monaco
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('visibilitychange', handleVisibilityChange, true);
    window.addEventListener('blur', handleWindowBlur, true);

    return () => {
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange, true);
      window.removeEventListener('blur', handleWindowBlur, true);
    };
  }, [isEnabled, roundId, reportViolation]);

  return { reportViolation };
}

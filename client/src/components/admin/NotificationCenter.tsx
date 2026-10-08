import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ShieldAlert, AlertTriangle, Info, Clock, X } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { AdminNotification } from '../../types';

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/notifications', { params: { limit: 20 } });
      if (res.data?.notifications) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen for real-time notifications from Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif: any) => {
      const item: AdminNotification = {
        id: notif.id || `notif-${Date.now()}`,
        notification_type: notif.notificationType || notif.notification_type || 'ALERT',
        title: notif.title || 'System Notification',
        message: notif.message,
        severity: notif.severity || 'INFO',
        participant_id: notif.participantId || notif.participant_id,
        participant_code: notif.participantCode || notif.participant_code,
        participant_name: notif.participantName || notif.participant_name,
        reference_type: notif.referenceType || notif.reference_type,
        reference_id: notif.referenceId || notif.reference_id,
        is_read: false,
        created_at: notif.createdAt || notif.created_at || new Date().toISOString(),
      };

      setNotifications((prev) => [item, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('incident:created', (inc: any) => {
      handleNewNotification({
        notificationType: 'SECURITY_ALERT',
        title: `Security Alert: ${inc.incidentType || 'Incident'}`,
        message: `Participant ${inc.participantCode || inc.participantName || ''} triggered a review.`,
        severity: inc.severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
        referenceType: 'security_incident',
        referenceId: inc.id,
      });
    });

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('incident:created');
    };
  }, [socket]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/admin/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/admin/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (notif: AdminNotification) => {
    if (!notif.is_read) {
      api.post(`/admin/notifications/${notif.id}/read`).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setIsOpen(false);

    if (notif.reference_type === 'security_incident' && notif.reference_id) {
      navigate(`/admin/security/${notif.reference_id}`);
    } else if (notif.reference_type === 'submission' && notif.reference_id) {
      navigate(`/admin/submissions/${notif.reference_id}`);
    } else if (notif.participant_id) {
      navigate(`/admin/participants/${notif.participant_id}`);
    } else {
      navigate('/admin/dashboard');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
        aria-label="Admin Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-red-600 text-white animate-pulse border border-slate-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl z-50 overflow-hidden flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold font-mono text-white tracking-wider">
                NOTIFICATIONS
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-800">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-500">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 hover:bg-slate-800/60 transition-all cursor-pointer flex items-start gap-3 ${
                    !n.is_read ? 'bg-purple-950/15' : ''
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-slate-800/90 border border-slate-700/60 shrink-0 mt-0.5">
                    {getSeverityIcon(n.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {n.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                    {n.message && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    )}
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      title="Mark as read"
                      className="p-1 text-slate-500 hover:text-cyan-400 rounded transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

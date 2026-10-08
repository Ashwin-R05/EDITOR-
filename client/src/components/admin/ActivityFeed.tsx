import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Send,
  ShieldAlert,
  Layers,
  Users,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { ActivityFeedItem } from '../../types';

interface ActivityFeedProps {
  maxItems?: number;
  showFilters?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  maxItems = 30,
  showFilters = true,
}) => {
  const { socket } = useSocket();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchActivities = async () => {
    try {
      const res = await api.get('/admin/activity', { params: { limit: maxItems } });
      if (res.data?.activities) {
        setActivities(res.data.activities);
      }
    } catch (err) {
      console.error('Failed to fetch activity feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [maxItems]);

  // Real-time activity listening
  useEffect(() => {
    if (!socket) return;

    const handleNewActivity = (activity: any) => {
      const item: ActivityFeedItem = {
        id: activity.id || `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        activity_type: activity.activityType || activity.activity_type || 'SYSTEM_EVENT',
        summary: activity.summary || 'Event logged',
        actor_name: activity.actorName || activity.actor_name,
        actor_role: activity.actorRole || activity.actor_role,
        participant_id: activity.participantId || activity.participant_id,
        round_id: activity.roundId || activity.round_id,
        created_at: activity.createdAt || activity.created_at || new Date().toISOString(),
        metadata: activity.metadata,
      };

      setActivities((prev) => [item, ...prev.slice(0, maxItems - 1)]);
    };

    socket.on('activity:new', handleNewActivity);
    socket.on('participant:connected', (p) => {
      handleNewActivity({
        activityType: 'PARTICIPANT_CONNECTED',
        summary: `Participant ${p.participantId || p.displayName} connected`,
        actorName: p.displayName,
        participantId: p.participantId,
      });
    });
    socket.on('participant:disconnected', (p) => {
      handleNewActivity({
        activityType: 'PARTICIPANT_DISCONNECTED',
        summary: `Participant ${p.participantId || p.displayName} disconnected`,
        actorName: p.displayName,
        participantId: p.participantId,
      });
    });
    socket.on('round:started', (r) => {
      handleNewActivity({
        activityType: 'ROUND_STARTED',
        summary: `Round ${r.roundNumber || ''} (${r.roundName || 'Competitive Round'}) started`,
        actorRole: 'ADMIN',
      });
    });
    socket.on('round:paused', (r) => {
      handleNewActivity({
        activityType: 'ROUND_PAUSED',
        summary: `Round ${r.roundNumber || ''} paused`,
        actorRole: 'ADMIN',
      });
    });
    socket.on('round:resumed', (r) => {
      handleNewActivity({
        activityType: 'ROUND_RESUMED',
        summary: `Round ${r.roundNumber || ''} resumed`,
        actorRole: 'ADMIN',
      });
    });
    socket.on('round:ended', (r) => {
      handleNewActivity({
        activityType: 'ROUND_ENDED',
        summary: `Round ${r.roundNumber || ''} ended`,
        actorRole: 'ADMIN',
      });
    });

    return () => {
      socket.off('activity:new', handleNewActivity);
      socket.off('participant:connected');
      socket.off('participant:disconnected');
      socket.off('round:started');
      socket.off('round:paused');
      socket.off('round:resumed');
      socket.off('round:ended');
    };
  }, [socket, maxItems]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SECURITY_INCIDENT':
      case 'INCIDENT_DETECTED':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'INCIDENT_RESOLVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'PARTICIPANT_DISQUALIFIED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'SUBMISSION_CREATED':
        return <Send className="w-4 h-4 text-cyan-400" />;
      case 'SUBMISSION_VALIDATED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'SUBMISSION_REJECTED':
        return <XCircle className="w-4 h-4 text-amber-400" />;
      case 'ROUND_STARTED':
      case 'ROUND_RESUMED':
      case 'ROUND_PAUSED':
      case 'ROUND_ENDED':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'PARTICIPANT_CONNECTED':
      case 'PARTICIPANT_DISCONNECTED':
        return <Users className="w-4 h-4 text-blue-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActivityBadgeClass = (type: string) => {
    if (type.includes('SECURITY') || type.includes('DISQUALIFIED')) {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
    if (type.includes('SUBMISSION')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
    if (type.includes('ROUND')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
    if (type.includes('RESOLVED') || type.includes('VALIDATED')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const filteredActivities = activities.filter((act) => {
    if (filter === 'ALL') return true;
    if (filter === 'SECURITY') {
      return (
        act.activity_type.includes('SECURITY') ||
        act.activity_type.includes('INCIDENT') ||
        act.activity_type.includes('DISQUALIFIED')
      );
    }
    if (filter === 'SUBMISSIONS') {
      return act.activity_type.includes('SUBMISSION');
    }
    if (filter === 'ROUNDS') {
      return act.activity_type.includes('ROUND');
    }
    if (filter === 'PARTICIPANTS') {
      return act.activity_type.includes('PARTICIPANT');
    }
    return true;
  });

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 10) return 'Just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400 animate-pulse" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
            Live Activity Feed
          </h2>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <button
          onClick={fetchActivities}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
          {['ALL', 'SECURITY', 'SUBMISSIONS', 'ROUNDS', 'PARTICIPANTS'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filter === f
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px] scrollbar-thin scrollbar-thumb-slate-800">
        {loading && activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            Loading activity stream...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No activities recorded in this category.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredActivities.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-800/90 border border-slate-700/50 mt-0.5">
                    {getActivityIcon(item.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${getActivityBadgeClass(
                          item.activity_type
                        )}`}
                      >
                        {item.activity_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-300 font-medium leading-relaxed truncate">
                      {item.summary}
                    </p>
                    {item.actor_name && (
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        Actor: {item.actor_name}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

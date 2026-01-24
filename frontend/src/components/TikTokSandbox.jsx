/**
 * TikTok Sandbox Mode Components
 * Used for TikTok app review demo video
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { 
  Play, CheckCircle, Clock, Loader2, Upload, AlertTriangle, 
  RefreshCw, Trash2, ExternalLink, Terminal, Info
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

// ==================== SANDBOX BADGE ====================

export const TikTokSandboxBadge = ({ className = "" }) => (
  <Badge 
    className={`bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-none font-medium ${className}`}
  >
    <AlertTriangle className="w-3 h-3 mr-1" />
    TikTok Sandbox Mode
  </Badge>
);

// ==================== SANDBOX INFO BANNER ====================

export const TikTokSandboxBanner = ({ onToggle, enabled = true }) => (
  <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4 mb-4">
    <div className="flex items-start gap-3">
      <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-cyan-400 font-medium">TikTok Sandbox Demonstration</h4>
          {onToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggle}
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:text-white"
            >
              Quitter le mode démo
            </Button>
          )}
        </div>
        <p className="text-white/60 text-sm">
          This is a sandbox demonstration of the TikTok integration for app review purposes.
          All API calls are simulated. No real data is sent to TikTok in sandbox mode.
        </p>
      </div>
    </div>
  </div>
);

// ==================== SANDBOX AUTH PAGE ====================

export const TikTokSandboxAuth = ({ onAuthorize, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const handleAuthorize = async () => {
    setLoading(true);
    try {
      const response = await api.post('/tiktok/sandbox-authorize', { authorize: true });
      if (response.data.success) {
        toast.success('TikTok account connected (Sandbox Mode)');
        onAuthorize?.(response.data);
      }
    } catch (error) {
      console.error('Sandbox auth error:', error);
      toast.error('Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md bg-slate-900 border-white/10">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-black rounded-2xl flex items-center justify-center">
            <Play className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-white text-xl">TikTok Authorization</CardTitle>
          <CardDescription className="text-white/60">
            Sandbox Mode - For App Review Demo
          </CardDescription>
          <TikTokSandboxBadge className="mx-auto mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4 space-y-3">
            <p className="text-white/80 text-sm">
              <strong>Alpha Agency CRM</strong> is requesting access to your TikTok account:
            </p>
            <ul className="text-white/60 text-sm space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                View your profile information
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Post videos on your behalf
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Schedule content for publishing
              </li>
            </ul>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-yellow-400 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                This is a sandbox demonstration. No real TikTok API calls will be made.
                Publication is simulated until the app is approved by TikTok.
              </span>
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 border-white/20 text-white/70"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-black hover:bg-gray-900 text-white"
              onClick={handleAuthorize}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authorizing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Authorize (Sandbox)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== API LOGS PANEL ====================

export const TikTokApiLogs = ({ show, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tiktok/api-logs?limit=30');
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await api.delete('/tiktok/api-logs');
      setLogs([]);
      toast.success('API logs cleared');
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  useEffect(() => {
    if (show) {
      loadLogs();
      const interval = setInterval(loadLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl bg-slate-900 border-white/10 max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              TikTok API Logs (Sandbox)
            </CardTitle>
            <CardDescription className="text-white/60">
              Simulated API calls for demo purposes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadLogs} className="border-white/20">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs} className="border-white/20 text-red-400">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} className="border-white/20">
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-[400px]">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No API logs yet</p>
                <p className="text-sm mt-1">Logs will appear as you interact with TikTok features</p>
              </div>
            ) : (
              <div className="space-y-2 font-mono text-sm">
                {logs.map((log) => (
                  <div 
                    key={log.id}
                    className="bg-black/40 rounded-lg p-3 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/40 text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge className={`text-xs ${
                        log.status === 200 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {log.status}
                      </Badge>
                      {log.is_sandbox && (
                        <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">SANDBOX</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${
                        log.method === 'GET' ? 'text-blue-400' :
                        log.method === 'POST' ? 'text-green-400' :
                        log.method === 'DELETE' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {log.method}
                      </span>
                      <span className="text-white/80">{log.endpoint}</span>
                    </div>
                    <p className="text-white/50 text-xs mt-1">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== TIKTOK POST COMPOSER ====================

export const TikTokPostComposer = ({ account, onSuccess, onCancel }) => {
  const [caption, setCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);

  const handlePublish = async () => {
    if (!caption.trim()) {
      toast.error('Please enter a caption');
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = isScheduled && scheduleDate && scheduleTime 
        ? `${scheduleDate}T${scheduleTime}:00` 
        : null;

      const response = await api.post('/tiktok/publish', {
        caption,
        video_url: videoUrl || null,
        scheduled_at: scheduledAt,
        account_id: account.id
      });

      if (response.data.success) {
        toast.success(response.data.message);
        onSuccess?.(response.data);
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast.error(error.response?.data?.detail || 'Failed to publish');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Play className="w-5 h-5" />
          Create TikTok Post
        </CardTitle>
        {account?.is_sandbox && <TikTokSandboxBadge />}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-white/80 text-sm mb-2 block">Caption</label>
          <Textarea
            placeholder="Write your TikTok caption..."
            className="bg-white/5 border-white/10 text-white min-h-[100px]"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <p className="text-white/40 text-xs mt-1">{caption.length}/2200 characters</p>
        </div>

        <div>
          <label className="text-white/80 text-sm mb-2 block">Video URL (optional for demo)</label>
          <Input
            placeholder="https://example.com/video.mp4"
            className="bg-white/5 border-white/10 text-white"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
              className="rounded border-white/20"
            />
            <span className="text-white/80 text-sm">Schedule for later</span>
          </label>
        </div>

        {isScheduled && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-white/80 text-sm mb-2 block">Date</label>
              <Input
                type="date"
                className="bg-white/5 border-white/10 text-white"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-white/80 text-sm mb-2 block">Time</label>
              <Input
                type="time"
                className="bg-white/5 border-white/10 text-white"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {account?.is_sandbox && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
            <p className="text-cyan-400 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Sandbox mode: Publication will be simulated. The post will transition through
                scheduled → publishing → published states automatically.
              </span>
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 border-white/20 text-white/70"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-black hover:bg-gray-900 text-white"
            onClick={handlePublish}
            disabled={loading || !caption.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isScheduled ? 'Scheduling...' : 'Publishing...'}
              </>
            ) : (
              <>
                {isScheduled ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Publish Now
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== TIKTOK POSTS LIST ====================

export const TikTokPostsList = ({ posts, onRefresh, onTriggerPublish }) => {
  const getStatusBadge = (post) => {
    const status = post.status;
    const isSandbox = post.is_sandbox;
    
    const statusConfig = {
      scheduled: { color: 'bg-blue-500/20 text-blue-400', icon: Clock },
      publishing: { color: 'bg-yellow-500/20 text-yellow-400', icon: Loader2 },
      published: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
      failed: { color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className={`w-3 h-3 mr-1 ${status === 'publishing' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
        {isSandbox && ' (Sandbox)'}
      </Badge>
    );
  };

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-white/40">
        <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No TikTok posts yet</p>
        <p className="text-sm mt-1">Create your first TikTok post to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div 
          key={post.id}
          className="bg-white/5 rounded-xl border border-white/10 p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getStatusBadge(post)}
                {post.is_sandbox && <TikTokSandboxBadge />}
              </div>
              <p className="text-white text-sm line-clamp-2">{post.content}</p>
              <p className="text-white/40 text-xs mt-2">
                {post.scheduled_at 
                  ? `Scheduled: ${new Date(post.scheduled_at).toLocaleString()}`
                  : `Created: ${new Date(post.created_at).toLocaleString()}`
                }
              </p>
              {post.published_at && (
                <p className="text-green-400 text-xs">
                  Published: {new Date(post.published_at).toLocaleString()}
                </p>
              )}
            </div>
            
            {post.status === 'scheduled' && post.is_sandbox && (
              <Button
                size="sm"
                className="bg-black hover:bg-gray-900 text-white"
                onClick={() => onTriggerPublish(post.id)}
              >
                <Play className="w-4 h-4 mr-1" />
                Publish Now
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default {
  TikTokSandboxBadge,
  TikTokSandboxBanner,
  TikTokSandboxAuth,
  TikTokApiLogs,
  TikTokPostComposer,
  TikTokPostsList
};

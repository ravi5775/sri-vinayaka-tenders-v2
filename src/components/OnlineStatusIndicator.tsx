import React from 'react';
import { useSync } from '../contexts/SyncContext';
import { Cloud, CloudOff } from 'lucide-react';

const OnlineStatusIndicator: React.FC = () => {
  const { isOnline } = useSync();

  const title = isOnline
    ? 'Application is online.'
    : 'You are offline. Some features may be unavailable.';

  return (
    <div className="flex items-center gap-2" title={title}>
      {isOnline ? (
        <Cloud size={18} className="text-green-400" />
      ) : (
        <CloudOff size={18} className="text-muted-foreground" />
      )}
      <span className="text-sm text-primary-foreground/70 hidden md:inline">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
};

export default OnlineStatusIndicator;

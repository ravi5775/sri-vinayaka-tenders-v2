import React, { createContext, useContext, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

type MessageCallback = (data?: any) => void;
type SubscriberMap = Map<string, Set<MessageCallback>>;

interface WebSocketContextType {
  subscribe: (messageType: string, callback: MessageCallback) => void;
  unsubscribe: (messageType: string, callback: MessageCallback) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const subscribers = useRef<SubscriberMap>(new Map());
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[WebSocket] Connection established.');
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data);
          if (type && subscribers.current.has(type)) {
            subscribers.current.get(type)?.forEach(callback => callback(data));
          }
        } catch (e) {
          console.error('[WebSocket] Sync parse error:', e);
        }
      };

      socket.onclose = (event) => {
        if (!event.wasClean) {
          if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = window.setTimeout(connect, 3000);
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      ws.current = socket;
    } catch (err) {
      reconnectTimeout.current = window.setTimeout(connect, 5000);
    }
  }, [user]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) ws.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  const subscribe = useCallback((messageType: string, callback: MessageCallback) => {
    if (!subscribers.current.has(messageType)) {
      subscribers.current.set(messageType, new Set());
    }
    subscribers.current.get(messageType)?.add(callback);
  }, []);

  const unsubscribe = useCallback((messageType: string, callback: MessageCallback) => {
    subscribers.current.get(messageType)?.delete(callback);
  }, []);

  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

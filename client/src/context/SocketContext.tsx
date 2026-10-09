import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

function getSocketUrl(): string | undefined {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
    try {
      const url = new URL(apiUrl);
      return url.origin;
    } catch {
      // fallback
    }
  }
  return undefined;
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = getSocketUrl();
    const socketInstance = socketUrl
      ? io(socketUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 15,
          reconnectionDelay: 1000,
          timeout: 20000,
        })
      : io({
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 15,
          reconnectionDelay: 1000,
          timeout: 20000,
        });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      setIsConnected(false);
    });

    // Periodic heartbeat to track connection and online status
    const heartbeatTimer = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit('heartbeat', { timestamp: Date.now() });
      }
    }, 20000);

    setSocket(socketInstance);

    return () => {
      clearInterval(heartbeatTimer);
      socketInstance.disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

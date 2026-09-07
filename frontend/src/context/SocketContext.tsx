import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useCurrentUser } from '../utils/currentUser';

// Same fallback as api/messageApi.ts and utils/mediaUrl.ts — when
// VITE_API_BASE_URL is unset, REST calls and the socket connection must
// still land on the same backend, or messages/calls silently never arrive
// in an environment that forgot to set the env var (REST would hit the
// deployed backend while the socket tried a local one that isn't running).
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, isConnected: false });

// Establishes exactly one Socket.IO connection for the whole app (real-time
// notifications + messaging), authenticated with the same JWT already used
// for REST calls. Mounted once near the root in App.tsx; components read
// it via useSocket() rather than each opening their own connection.
export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useCurrentUser();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

import { useSession } from "next-auth/react";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type SocketContextType = {
  socket: WebSocket | null;
  user: { id: string; token?: string } | null;
  connectionError: boolean;
  setUser: Dispatch<SetStateAction<{ id: string; token?: string } | null>>;
  loading: boolean;
  sendMessage: (type: string, data: { [key: string]: any }) => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  user: null,
  connectionError: false,
  setUser: () => {},
  loading: true,
  sendMessage: () => {},
});


export const SocketContextProvider = ({ children }: PropsWithChildren) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [user, setUser] = useState<{ id: string; token?: string } | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const session = useSession();

  const connectWebSocket = (wsUrl: string) => {
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    setSocket(ws);

   ws.onopen = () => {
  console.log("WebSocket connected.");

  // ✅ Safely cast token as a string (if it exists)
  const token = session.data?.user?.token as string | undefined;
  setUser({
    id: session.data?.user?.id!,
    token,
  });

  console.log("✅ WebSocket token:", token);

  setConnectionError(false);
  setLoading(false);
  setRetryCount(0);
};


    ws.onmessage = (event) => {
      console.log("Received:", event.data);
      // Handle message
    };

    ws.onerror = () => {
      console.log("WebSocket error.");
      setConnectionError(true);
      setLoading(false);
    };

    ws.onclose = (event) => {
      console.warn("WebSocket closed:", event);
      setSocket(null);
      setLoading(true);
      setConnectionError(true);

      const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
      setRetryCount((prev) => prev + 1);
      setTimeout(() => {
        connectWebSocket(wsUrl);
      }, delay);
    };
  };

useEffect(() => {
  const setupWebSocket = async () => {
    if (
      session.status === "authenticated" &&
      session.data?.user?.id &&
      !socket
    ) {
      const wsUrl =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL ??
  (process.env.NODE_ENV === "production" ? "wss://your-production-url" : "ws://localhost:8080");


      // ✅ Use token from session.user.token (already set in your NextAuth config)
      const token = session.data.user.token;

      console.log("✅ Session Token:", token);

      setUser({
        id: session.data.user.id,
        token: token ?? undefined,
      });

      connectWebSocket(wsUrl);
    }
  };

  setupWebSocket();

  return () => {
    if (socket?.readyState === WebSocket.OPEN) {
      console.log("Closing WebSocket...");
      socket.close();
    }
  };
}, [session.status, session.data?.user?.id]);



  const sendMessage = (type: string, data: { [key: string]: any }) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type,
          data: {
            ...data,
            token: user?.token,
          },
        })
      );
    } else {
      console.error("WebSocket is not open.");
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        user,
        connectionError,
        setUser,
        loading,
        sendMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
export const useSocket = () => useContext(SocketContext);

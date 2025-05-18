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
  const [retryCount, setRetryCount] = useState(0); // For exponential backoff
  const session = useSession();

  const connectWebSocket = (wsUrl: string) => {
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connection established.");
      setSocket(ws);
      setUser(session.data?.user || null);
      setLoading(false);
      setConnectionError(false);
      setRetryCount(0); // Reset retry count on successful connection

      // If your server requires the token upon connection, you might send it here
      // Example:
      // if (session.data?.user?.token) {
      //   ws.send(JSON.stringify({ type: "auth", token: session.data.user.token }));
      // }
    };

    ws.onmessage = (event) => {
      console.log("Message received from server:", event.data);
      // TODO: Implement your message handling logic here.
      // Parse the event.data (likely JSON) and update your application state.
    };

    ws.onerror = (error) => {
      // console.error("WebSocket error encountered:", error);
      console.log(`WebSocket readyState: ${ws.readyState}`);
      setConnectionError(true);
      setLoading(false);
      // TODO: Consider more specific error handling based on the error object.
    };

    ws.onclose = (event) => {
      console.warn("WebSocket connection closed:", event);
      console.log(`Code: ${event.code}, Reason: ${event.reason}`);
      setSocket(null);
      setLoading(true);
      setConnectionError(true);

      // Retry after a delay, with exponential backoff to avoid flooding the server
      const delay = Math.min(3000 * Math.pow(2, retryCount), 30000); // Cap at 30 seconds
      setRetryCount((prev) => prev + 1);

      setTimeout(() => {
        console.log("Retrying WebSocket connection...");
        // Consider adding a check for network connectivity before retrying.
        connectWebSocket(wsUrl);
      }, delay);
      // TODO: Consider implementing a maximum number of retry attempts.
    };

    return ws;
  };

  useEffect(() => {
    // Only attempt to connect if the session is authenticated and we have a user ID
    // and if a socket connection doesn't already exist.
    if (session.status === "authenticated" && session.data?.user?.id && !socket) {
      const wsUrl = process.env.NEXT_PUBLIC_WSS_URL || "ws://localhost:8080";
      connectWebSocket(wsUrl);
    }

    // Cleanup function to close the WebSocket connection when the component unmounts
    return () => {
      if (socket) {
        console.log("Closing WebSocket connection...");
        socket.close();
      }
    };
  }, [session.status, session.data?.user, socket]);

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
      console.error("WebSocket is not open. Cannot send message.");
      // TODO: Consider buffering messages to send when the connection is re-established.
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

export const useSocket = () => {
  return useContext(SocketContext);
};

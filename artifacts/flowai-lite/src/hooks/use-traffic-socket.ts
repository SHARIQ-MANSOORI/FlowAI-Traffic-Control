import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTrafficStateQueryKey, type TrafficState } from "@workspace/api-client-react";

export function useTrafficSocket() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // Connect to the socket server on the same host
    const socket: Socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("trafficUpdate", (data: TrafficState) => {
      // Update the React Query cache directly when we receive a websocket event
      // This allows the rest of the app to just use useGetTrafficState() seamlessly
      queryClient.setQueryData(getGetTrafficStateQueryKey(), data);
      setLastUpdated(new Date());
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return { isConnected, lastUpdated };
}

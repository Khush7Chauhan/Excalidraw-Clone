import { useCallback, useEffect, useRef, useState } from "react";
import { getWebSocketUrl } from "../src/config";
import type { CanvasSocketMessage } from "../src/types";

export type SocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface UseSocketOptions {
    roomId?: string;
    token?: string | null;
    enabled?: boolean;
    onMessage?: (message: CanvasSocketMessage) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
    const { roomId, token, enabled = true, onMessage } = options;
    const socketRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<SocketStatus>("idle");
    const [lastMessage, setLastMessage] = useState<CanvasSocketMessage | null>(null);

    useEffect(() => {
        if (!enabled || !roomId) {
            return;
        }

        setStatus("connecting");
        const socket = new WebSocket(getWebSocketUrl({ roomId, ...(token ? { token } : {}) }));
        socketRef.current = socket;

        socket.onopen = () => {
            setStatus("open");
            socket.send(JSON.stringify({ type: "join-room", roomId, token }));
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data as string) as CanvasSocketMessage;
                setLastMessage(message);
                onMessage?.(message);
            } catch {
                // Ignore malformed payloads so one bad message does not kill the session.
            }
        };

        socket.onerror = () => {
            setStatus("error");
        };

        socket.onclose = () => {
            setStatus("closed");
        };

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, [enabled, roomId, token, onMessage]);

    const send = useCallback((message: CanvasSocketMessage) => {
        const socket = socketRef.current;

        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return false;
        }

        socket.send(JSON.stringify(message));
        return true;
    }, []);

    return {
        socket: socketRef.current,
        status,
        connected: status === "open",
        lastMessage,
        send
    };
}
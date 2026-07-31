export const DEFAULT_HTTP_API_URL = "http://localhost:3001";
export const DEFAULT_WS_URL = "ws://localhost:3002";

export function getApiBaseUrl() {
    return import.meta.env.VITE_API_URL || DEFAULT_HTTP_API_URL;
}

export function getWebSocketUrl(params: { roomId?: string; token?: string }) {
    const url = new URL(import.meta.env.VITE_WS_URL || DEFAULT_WS_URL);

    if (params.roomId) {
        url.searchParams.set("roomId", params.roomId);
    }

    if (params.token) {
        url.searchParams.set("token", params.token);
    }

    return url.toString();
}
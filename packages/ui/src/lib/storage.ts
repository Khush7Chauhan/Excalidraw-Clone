const TOKEN_KEY = "excelidraw.jwt";

export function readAuthToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.localStorage.getItem(TOKEN_KEY);
}

export function writeAuthToken(token: string | null) {
    if (typeof window === "undefined") {
        return;
    }

    if (token) {
        window.localStorage.setItem(TOKEN_KEY, token);
        return;
    }

    window.localStorage.removeItem(TOKEN_KEY);
}
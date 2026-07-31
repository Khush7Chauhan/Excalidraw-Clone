import { CreateRoomSchema, CreateUserSchema, SigninSchema } from "@repo/common";
import { getApiBaseUrl } from "../config";
import type { AuthResponse, CreateRoomResponse, RoomRecord } from "../types";

async function parseJsonResponse<T>(response: Response): Promise<T> {
    const payload = (await response.json()) as T;

    if (!response.ok) {
        const error = new Error("Request failed");
        (error as Error & { payload?: T }).payload = payload;
        throw error;
    }

    return payload;
}

async function request<T>(path: string, init?: RequestInit, token?: string | null) {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: token } : {}),
            ...(init?.headers ?? {})
        }
    });

    return parseJsonResponse<T>(response);
}

export async function signUpUser(input: unknown) {
    const parsed = CreateUserSchema.safeParse(input);

    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid sign up payload");
    }

    return request<{ userId: string }>("/signup", {
        method: "POST",
        body: JSON.stringify(parsed.data)
    });
}

export async function signInUser(input: unknown) {
    const parsed = SigninSchema.safeParse(input);

    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid sign in payload");
    }

    return request<AuthResponse>("/signin", {
        method: "POST",
        body: JSON.stringify(parsed.data)
    });
}

export async function createRoom(input: unknown, token: string | null) {
    const parsed = CreateRoomSchema.safeParse(input);

    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid room payload");
    }

    return request<CreateRoomResponse>(
        "/room",
        {
            method: "POST",
            body: JSON.stringify(parsed.data)
        },
        token
    );
}

export async function loadRoomBySlug(slug: string) {
    return request<{ room: RoomRecord | null }>(`/room/${encodeURIComponent(slug)}`);
}
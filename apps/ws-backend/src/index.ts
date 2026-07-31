import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";

type Point = {
    x: number;
    y: number;
};

type PencilElement = {
    id: string;
    type: "pencil";
    points: Point[];
    color?: string;
    strokeWidth?: number;
    userId?: string;
    roomId?: string;
    createdAt?: number;
};

type CanvasSocketMessage =
    | { type: "join-room"; roomId: string; token?: string | null }
    | { type: "element:add"; roomId: string; element: PencilElement }
    | { type: "elements:sync"; roomId: string; elements: PencilElement[] }
    | { type: "element:remove"; roomId: string; elementId: string }
    | { type: "cursor:move"; roomId: string; x: number; y: number };

type AuthPayload = {
    userId: string;
};

type RoomState = {
    elements: PencilElement[];
    clients: Set<WebSocket>;
};

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
const PORT = Number(process.env.WS_PORT || 3002);

const rooms = new Map<string, RoomState>();
const clientRooms = new Map<WebSocket, string>();

function getRoom(roomId: string) {
    const existingRoom = rooms.get(roomId);

    if (existingRoom) {
        return existingRoom;
    }

    const createdRoom: RoomState = {
        elements: [],
        clients: new Set<WebSocket>()
    };

    rooms.set(roomId, createdRoom);
    return createdRoom;
}

function safeParseMessage(data: WebSocket.RawData): CanvasSocketMessage | null {
    try {
        return JSON.parse(data.toString()) as CanvasSocketMessage;
    } catch {
        return null;
    }
}

function verifyToken(token?: string | null) {
    if (!token) {
        return null;
    }

    try {
        return jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
        return null;
    }
}

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (socket, request) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const roomIdFromQuery = requestUrl.searchParams.get("roomId");
    const tokenFromQuery = requestUrl.searchParams.get("token");
    const auth = verifyToken(tokenFromQuery);

    if (tokenFromQuery && !auth) {
        socket.close(4001, "Unauthorized");
        return;
    }

    if (roomIdFromQuery) {
        const room = getRoom(roomIdFromQuery);
        room.clients.add(socket);
        clientRooms.set(socket, roomIdFromQuery);
        socket.send(JSON.stringify({ type: "elements:sync", roomId: roomIdFromQuery, elements: room.elements } satisfies CanvasSocketMessage));
    }

    socket.on("message", (data) => {
        const message = safeParseMessage(data);

        if (!message) {
            return;
        }

        const roomId = message.roomId;
        const room = getRoom(roomId);

        if (message.type === "join-room") {
            const joinAuth = verifyToken(message.token ?? tokenFromQuery);
            if ((message.token ?? tokenFromQuery) && !joinAuth) {
                socket.close(4001, "Unauthorized");
                return;
            }

            room.clients.add(socket);
            clientRooms.set(socket, roomId);
            socket.send(JSON.stringify({ type: "elements:sync", roomId, elements: room.elements } satisfies CanvasSocketMessage));
            return;
        }

        if (message.type === "element:add") {
            room.elements = [...room.elements, message.element];
            for (const client of room.clients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(message));
                }
            }
            return;
        }

        if (message.type === "element:remove") {
            room.elements = room.elements.filter((element) => element.id !== message.elementId);
            for (const client of room.clients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(message));
                }
            }
            return;
        }

        if (message.type === "cursor:move") {
            for (const client of room.clients) {
                if (client !== socket && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(message));
                }
            }
        }
    });

    socket.on("close", () => {
        const roomId = clientRooms.get(socket);
        if (!roomId) {
            return;
        }

        const room = rooms.get(roomId);
        room?.clients.delete(socket);
        clientRooms.delete(socket);
    });
});

server.listen(PORT, () => {
    console.log(`ws-backend listening on ${PORT}`);
});
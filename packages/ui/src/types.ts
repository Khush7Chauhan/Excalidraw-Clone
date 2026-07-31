export type Point = {
    x: number;
    y: number;
};

export type PencilElement = {
    id: string;
    type: "pencil";
    points: Point[];
    color?: string;
    strokeWidth?: number;
    userId?: string;
    roomId?: string;
    createdAt?: number;
};

export type AppState = {
    zoom: number;
    scrollX: number;
    scrollY: number;
};

export type CanvasSocketMessage =
    | {
          type: "join-room";
          roomId: string;
          token?: string | null;
      }
    | {
          type: "element:add";
          roomId: string;
          element: PencilElement;
      }
    | {
          type: "elements:sync";
          roomId: string;
          elements: PencilElement[];
      }
    | {
          type: "element:remove";
          roomId: string;
          elementId: string;
      }
    | {
          type: "cursor:move";
          roomId: string;
          x: number;
          y: number;
      };

export type AuthResponse = {
    token: string;
};

export type CreateRoomResponse = {
    roomId: number;
};

export type RoomRecord = {
    id: number;
    slug: string;
    createdAt?: string;
    adminId?: string;
};
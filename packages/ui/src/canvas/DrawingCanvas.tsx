import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { FloatingToolbar } from "../components/FloatingToolbar";
import type { AppState, CanvasSocketMessage, PencilElement, Point } from "../types";

interface DrawingCanvasProps {
    roomId: string;
    initialElements?: PencilElement[];
    sendSocketMessage?: (message: CanvasSocketMessage) => boolean;
    onElementsChange?: (elements: PencilElement[]) => void;
}

type InteractionMode = "idle" | "drawing" | "panning";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const DEFAULT_STROKE_WIDTH = 2;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function createPencilElement(roomId: string, startPoint: Point): PencilElement {
    return {
        id: crypto.randomUUID(),
        type: "pencil",
        points: [startPoint],
        strokeWidth: DEFAULT_STROKE_WIDTH,
        createdAt: Date.now(),
        roomId
    };
}

export function DrawingCanvas({ roomId, initialElements = [], sendSocketMessage, onElementsChange }: DrawingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const interactionModeRef = useRef<InteractionMode>("idle");
    const activePointerIdRef = useRef<number | null>(null);
    const panOriginRef = useRef({ x: 0, y: 0, scrollX: 0, scrollY: 0 });
    const drawingPathRef = useRef<PencilElement | null>(null);
    const spacePressedRef = useRef(false);

    const [elements, setElements] = useState<PencilElement[]>(initialElements);
    const [appState, setAppState] = useState<AppState>({ zoom: 1, scrollX: 0, scrollY: 0 });
    const [tool, setTool] = useState<"pencil" | "pan">("pencil");

    const screenToWorld = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return { x: clientX, y: clientY };
        }

        const rect = canvas.getBoundingClientRect();
        const screenX = clientX - rect.left;
        const screenY = clientY - rect.top;

        return {
            x: (screenX - appState.scrollX) / appState.zoom,
            y: (screenY - appState.scrollY) / appState.zoom
        };
    };

    const isPanning = tool === "pan" || spacePressedRef.current;

    useEffect(() => {
        onElementsChange?.(elements);
    }, [elements, onElementsChange]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code === "Space") {
                spacePressedRef.current = true;
                event.preventDefault();
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === "Space") {
                spacePressedRef.current = false;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            const devicePixelRatio = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
            canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
        };

        resizeCanvas();

        const observer = new ResizeObserver(resizeCanvas);
        observer.observe(canvas);
        window.addEventListener("resize", resizeCanvas);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", resizeCanvas);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context) {
            return;
        }

        const devicePixelRatio = window.devicePixelRatio || 1;
        const width = canvas.width / devicePixelRatio;
        const height = canvas.height / devicePixelRatio;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.fillStyle = "#f8fafc";
        context.fillRect(0, 0, width, height);

        context.save();
        context.translate(appState.scrollX, appState.scrollY);
        context.scale(appState.zoom, appState.zoom);
        context.lineJoin = "round";
        context.lineCap = "round";

        for (const element of elements) {
            if (element.type !== "pencil" || element.points.length === 0) {
                continue;
            }

            context.beginPath();
            context.strokeStyle = element.color ?? "#0f172a";
            context.lineWidth = (element.strokeWidth ?? DEFAULT_STROKE_WIDTH) / appState.zoom;

            const [firstPoint, ...otherPoints] = element.points;
            context.moveTo(firstPoint.x, firstPoint.y);

            for (const point of otherPoints) {
                context.lineTo(point.x, point.y);
            }

            context.stroke();
        }

        context.restore();
    }, [appState, elements]);

    const updateActivePoint = (clientX: number, clientY: number) => {
        if (interactionModeRef.current === "drawing" && drawingPathRef.current) {
            const point = screenToWorld(clientX, clientY);
            const currentElement = drawingPathRef.current;
            const nextElement = { ...currentElement, points: [...currentElement.points, point] };

            drawingPathRef.current = nextElement;
            setElements((currentElements) =>
                currentElements.map((element) => (element.id === currentElement.id ? nextElement : element))
            );
            return;
        }

        if (interactionModeRef.current === "panning") {
            const panOrigin = panOriginRef.current;
            const deltaX = clientX - panOrigin.x;
            const deltaY = clientY - panOrigin.y;

            setAppState({
                zoom: appState.zoom,
                scrollX: panOrigin.scrollX + deltaX,
                scrollY: panOrigin.scrollY + deltaY
            });
        }
    };

    const finishInteraction = () => {
        if (interactionModeRef.current === "drawing" && drawingPathRef.current) {
            sendSocketMessage?.({
                type: "element:add",
                roomId,
                element: drawingPathRef.current
            });
        }

        interactionModeRef.current = "idle";
        activePointerIdRef.current = null;
        drawingPathRef.current = null;
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        canvas.setPointerCapture(event.pointerId);
        activePointerIdRef.current = event.pointerId;

        if (event.button === 1 || isPanning) {
            interactionModeRef.current = "panning";
            panOriginRef.current = {
                x: event.clientX,
                y: event.clientY,
                scrollX: appState.scrollX,
                scrollY: appState.scrollY
            };
            setTool("pan");
            return;
        }

        if (event.button !== 0) {
            return;
        }

        interactionModeRef.current = "drawing";
        setTool("pencil");

        const element = createPencilElement(roomId, screenToWorld(event.clientX, event.clientY));
        drawingPathRef.current = element;
        setElements((currentElements) => [...currentElements, element]);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (activePointerIdRef.current !== event.pointerId) {
            return;
        }

        if (interactionModeRef.current === "drawing" || interactionModeRef.current === "panning") {
            updateActivePoint(event.clientX, event.clientY);
        }
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (activePointerIdRef.current !== event.pointerId) {
            return;
        }

        finishInteraction();
    };

    const handlePointerCancel = () => {
        finishInteraction();
    };

    const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
        event.preventDefault();

        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            const rect = canvas.getBoundingClientRect();
            const screenX = event.clientX - rect.left;
            const screenY = event.clientY - rect.top;
            const zoomDirection = event.deltaY > 0 ? -1 : 1;
            const zoomFactor = Math.exp(zoomDirection * 0.12);
            const nextZoom = clamp(appState.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);
            const worldX = (screenX - appState.scrollX) / appState.zoom;
            const worldY = (screenY - appState.scrollY) / appState.zoom;

            setAppState({
                zoom: nextZoom,
                scrollX: screenX - worldX * nextZoom,
                scrollY: screenY - worldY * nextZoom
            });
            return;
        }

        setAppState((currentState) => ({
            ...currentState,
            scrollX: currentState.scrollX - event.deltaX,
            scrollY: currentState.scrollY - event.deltaY
        }));
    };

    const resetView = () => {
        setAppState({ zoom: 1, scrollX: 0, scrollY: 0 });
    };

    const zoomIn = () => {
        setAppState((currentState) => ({
            ...currentState,
            zoom: clamp(currentState.zoom * 1.1, MIN_ZOOM, MAX_ZOOM)
        }));
    };

    const zoomOut = () => {
        setAppState((currentState) => ({
            ...currentState,
            zoom: clamp(currentState.zoom / 1.1, MIN_ZOOM, MAX_ZOOM)
        }));
    };

    return (
        <div className="relative h-full min-h-[720px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
            <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onWheel={handleWheel}
                onMouseLeave={finishInteraction}
            />

            <div className="pointer-events-none absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                <FloatingToolbar>
                    <Button type="button" variant={tool === "pencil" ? "primary" : "secondary"} onClick={() => setTool("pencil")}>Pencil</Button>
                    <Button type="button" variant={tool === "pan" ? "primary" : "secondary"} onClick={() => setTool("pan")}>Pan</Button>
                </FloatingToolbar>

                <FloatingToolbar>
                    <span className="text-sm text-slate-600">Room {roomId} · {Math.round(appState.zoom * 100)}%</span>
                    <Button type="button" variant="secondary" onClick={zoomOut}>-</Button>
                    <Button type="button" variant="secondary" onClick={resetView}>Reset</Button>
                    <Button type="button" variant="secondary" onClick={zoomIn}>+</Button>
                </FloatingToolbar>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 max-w-md rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-lg backdrop-blur-md">
                Hold Space or use the middle mouse button to pan. Use Ctrl or Cmd + wheel to zoom around the cursor.
            </div>
        </div>
    );
}
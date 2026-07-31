import { useEffect, useState } from "react";
import { DrawingCanvas } from "../canvas/DrawingCanvas";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { Input } from "../components/Input";
import { createRoom, loadRoomBySlug, signInUser, signUpUser } from "../lib/api";
import { readAuthToken, writeAuthToken } from "../lib/storage";
import type { CanvasSocketMessage, PencilElement } from "../types";
import { useSocket } from "../../hooks/useSocket";

type RouteState =
    | { kind: "dashboard" }
    | { kind: "signin" }
    | { kind: "signup" }
    | { kind: "canvas"; roomId: string };

function parseRoute(pathname: string): RouteState {
    if (pathname.startsWith("/signin")) {
        return { kind: "signin" };
    }

    if (pathname.startsWith("/signup")) {
        return { kind: "signup" };
    }

    const canvasMatch = pathname.match(/^\/canvas\/([^/]+)$/);
    if (canvasMatch?.[1]) {
        return { kind: "canvas", roomId: decodeURIComponent(canvasMatch[1]) };
    }

    return { kind: "dashboard" };
}

function useRoute() {
    const [route, setRoute] = useState<RouteState>(() => parseRoute(window.location.pathname));

    useEffect(() => {
        const handlePopState = () => setRoute(parseRoute(window.location.pathname));
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const navigate = (path: string) => {
        window.history.pushState({}, "", path);
        setRoute(parseRoute(path));
    };

    return { route, navigate };
}

function Shell({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0_70%)] p-4 text-slate-950 md:p-8">{children}</div>;
}

function AuthCard({
    title,
    subtitle,
    submitLabel,
    showName,
    onSubmit,
    footer
}: {
    title: string;
    subtitle: string;
    submitLabel: string;
    showName: boolean;
    onSubmit: (payload: { name?: string; email: string; password: string }) => Promise<void>;
    footer: React.ReactNode;
}) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await onSubmit({ name, email, password });
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6 rounded-[2rem] border border-white/70 bg-slate-950 px-8 py-10 text-white shadow-[0_40px_140px_rgba(15,23,42,0.35)] md:px-10 md:py-12">
                <div className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200">Collaborative whiteboard for product teams</div>
                <div className="space-y-4">
                    <h1 className="max-w-xl text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1>
                    <p className="max-w-lg text-base leading-7 text-slate-300 md:text-lg">{subtitle}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        ["Realtime", "Socket sync across every connected client"],
                        ["Infinite canvas", "Pan, zoom, and sketch without boundaries"],
                        ["Monorepo ready", "Shared UI and types across the workspace"]
                    ].map(([headline, body]) => (
                        <div key={headline} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="font-medium text-white">{headline}</div>
                            <div className="mt-1 text-sm leading-6 text-slate-300">{body}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl md:p-8">
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-950">{submitLabel}</h2>
                        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
                    </div>

                    {showName ? <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ada Lovelace" required /> : null}
                    <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ada@studio.dev" required />
                    <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required />

                    {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

                    <Button type="submit" className="w-full" disabled={loading}>{loading ? "Working..." : submitLabel}</Button>
                    <div className="text-sm text-slate-600">{footer}</div>
                </form>
            </section>
        </div>
    );
}

function Dashboard({ token, onCreateRoom, onJoinRoom, onSignOut }: { token: string | null; onCreateRoom: (name: string) => Promise<string>; onJoinRoom: (roomId: string) => void; onSignOut: () => void; }) {
    const [roomSlug, setRoomSlug] = useState("");
    const [roomId, setRoomId] = useState("");
    const [lookupSlug, setLookupSlug] = useState("");
    const [status, setStatus] = useState<string | null>(null);

    const handleCreateRoom = async (event: React.FormEvent) => {
        event.preventDefault();
        setStatus(null);
        try {
            const response = await onCreateRoom(roomSlug);
            setStatus(`Created room ${response}`);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Unable to create room");
        }
    };

    const handleLookupRoom = async (event: React.FormEvent) => {
        event.preventDefault();
        setStatus(null);

        try {
            const response = await loadRoomBySlug(lookupSlug);
            if (!response.room) {
                setStatus("No room found for that slug.");
                return;
            }

            onJoinRoom(String(response.room.id));
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Unable to resolve room");
        }
    };

    return (
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-6">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/70 bg-white/80 px-6 py-5 shadow-lg backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Excelidraw</h1>
                    <p className="text-sm text-slate-600">Create a room or jump into an existing board.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">{token ? "Authenticated" : "Guest mode"}</span>
                    <Button type="button" variant="secondary" onClick={onSignOut}>Sign out</Button>
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
                    <h2 className="text-xl font-semibold text-slate-950">Create room</h2>
                    <p className="mt-2 text-sm text-slate-600">Create a new collaborative canvas and share the room ID with your team.</p>
                    <form className="mt-6 space-y-4" onSubmit={handleCreateRoom}>
                        <Input label="Room slug" value={roomSlug} onChange={(event) => setRoomSlug(event.target.value)} placeholder="design-review" required />
                        <Button type="submit" className="w-full">Create room</Button>
                    </form>
                </section>

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
                    <h2 className="text-xl font-semibold text-slate-950">Join room</h2>
                    <p className="mt-2 text-sm text-slate-600">Paste an existing room ID or resolve one from a slug.</p>
                    <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onJoinRoom(roomId); }}>
                        <Input label="Room ID" value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="42" required />
                        <Button type="submit" className="w-full">Enter room</Button>
                    </form>

                    <div className="mt-6 border-t border-slate-200 pt-6">
                        <form className="space-y-4" onSubmit={handleLookupRoom}>
                            <Input label="Find by slug" value={lookupSlug} onChange={(event) => setLookupSlug(event.target.value)} placeholder="design-review" />
                            <Button type="submit" className="w-full" variant="secondary">Resolve slug</Button>
                        </form>
                    </div>

                    {status ? <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{status}</p> : null}
                </section>
            </div>
        </div>
    );
}

function CanvasPage({ roomId, token, navigate }: { roomId: string; token: string | null; navigate: (path: string) => void; }) {
    const [elements, setElements] = useState<PencilElement[]>([]);

    const { status, connected, send } = useSocket({
        roomId,
        token,
        enabled: Boolean(roomId),
        onMessage: (message) => {
            if (message.type === "elements:sync") {
                setElements(message.elements);
            }

            if (message.type === "element:add") {
                setElements((currentElements) => {
                    if (currentElements.some((element) => element.id === message.element.id)) {
                        return currentElements;
                    }

                    return [...currentElements, message.element];
                });
            }
        }
    });

    const broadcastMessage = (message: CanvasSocketMessage) => send(message);

    return (
        <div className="mx-auto flex h-screen w-full max-w-[1600px] flex-col gap-4 p-4">
            <div className="flex items-center justify-between rounded-[2rem] border border-white/70 bg-white/85 px-6 py-4 shadow-lg backdrop-blur-md">
                <div>
                    <button type="button" className="text-sm font-medium text-slate-500 underline-offset-4 hover:underline" onClick={() => navigate("/")}>Back to dashboard</button>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Room {roomId}</h1>
                    <p className="text-sm text-slate-600">{connected ? "Live collaboration is active." : `Socket status: ${status}`}</p>
                </div>
                <div className="text-right text-sm text-slate-600">
                    <div>{elements.length} element{elements.length === 1 ? "" : "s"}</div>
                    <div>{status}</div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <DrawingCanvas roomId={roomId} initialElements={elements} sendSocketMessage={broadcastMessage} onElementsChange={setElements} />
            </div>
        </div>
    );
}

export function ExcelidrawApp() {
    const { route, navigate } = useRoute();
    const [token, setToken] = useState<string | null>(() => readAuthToken());

    const signOut = () => {
        writeAuthToken(null);
        setToken(null);
        navigate("/signin");
    };

    const signIn = async (payload: { email: string; password: string }) => {
        const response = await signInUser(payload);
        writeAuthToken(response.token);
        setToken(response.token);
        navigate("/");
    };

    const signUp = async (payload: { name?: string; email: string; password: string }) => {
        await signUpUser(payload);
        const response = await signInUser({ email: payload.email, password: payload.password });
        writeAuthToken(response.token);
        setToken(response.token);
        navigate("/");
    };

    const createRoomHandler = async (roomSlug: string) => {
        const response = await createRoom({ slug: roomSlug }, token);
        navigate(`/canvas/${response.roomId}`);
        return String(response.roomId);
    };

    const joinRoomHandler = (roomId: string) => {
        navigate(`/canvas/${roomId}`);
    };

    if (route.kind === "signin") {
        return (
            <Shell>
                <AuthCard
                    title="Sign in to your workspace"
                    subtitle="Return to your rooms, recover the latest drawing state, and continue collaborating."
                    submitLabel="Sign in"
                    showName={false}
                    onSubmit={signIn}
                    footer={<><button type="button" className="font-medium text-slate-950 underline" onClick={() => navigate("/signup")}>Create an account</button></>}
                />
            </Shell>
        );
    }

    if (route.kind === "signup") {
        return (
            <Shell>
                <AuthCard
                    title="Create your team account"
                    subtitle="Set up a workspace, invite collaborators, and keep every drawing in sync."
                    submitLabel="Sign up"
                    showName
                    onSubmit={signUp}
                    footer={<><button type="button" className="font-medium text-slate-950 underline" onClick={() => navigate("/signin")}>Sign in</button></>}
                />
            </Shell>
        );
    }

    if (route.kind === "canvas") {
        return (
            <Shell>
                <CanvasPage roomId={route.roomId} token={token} navigate={navigate} />
            </Shell>
        );
    }

    return (
        <Shell>
            <Dashboard token={token} onCreateRoom={createRoomHandler} onJoinRoom={joinRoomHandler} onSignOut={signOut} />
            <Dialog open={!token} title="You are not signed in" description="You can still inspect the dashboard, but authentication is required to create and sync rooms." onClose={() => navigate("/signup")}>
                <div className="flex gap-3">
                    <Button type="button" onClick={() => navigate("/signin")}>Sign in</Button>
                    <Button type="button" variant="secondary" onClick={() => navigate("/signup")}>Sign up</Button>
                </div>
            </Dialog>
        </Shell>
    );
}
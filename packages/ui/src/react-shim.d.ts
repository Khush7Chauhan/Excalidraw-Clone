declare module "react" {
  export type ReactNode = any;
  export type PropsWithChildren<P = object> = P & { children?: ReactNode };
  export interface ButtonHTMLAttributes<T> {
    className?: string;
    type?: string;
    disabled?: boolean;
    onClick?: (...args: any[]) => void;
    onSubmit?: (...args: any[]) => void;
    [key: string]: any;
  }
  export interface InputHTMLAttributes<T> {
    className?: string;
    id?: string;
    label?: string;
    error?: string;
    value?: any;
    type?: string;
    placeholder?: string;
    required?: boolean;
    onChange?: (...args: any[]) => void;
    [key: string]: any;
  }
  export interface FormEvent<T = any> {
    preventDefault(): void;
  }
  export interface PointerEvent<T = any> {
    button: number;
    clientX: number;
    clientY: number;
    pointerId: number;
  }
  export interface WheelEvent<T = any> {
    preventDefault(): void;
    clientX: number;
    clientY: number;
    deltaX: number;
    deltaY: number;
    ctrlKey: boolean;
    metaKey: boolean;
  }
  export interface KeyboardEvent {
    code: string;
    preventDefault(): void;
  }
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useState<T>(initialValue: T): [T, (value: T | ((previous: T) => T)) => void];
}

declare module "react-dom/client" {
  export function createRoot(container: HTMLElement): { render(node: any): void };
}

declare module "react-dom" {
  export function createPortal(node: any, container: Element): any;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
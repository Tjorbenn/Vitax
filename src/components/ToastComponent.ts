import Toast from "typescript-toastify";

export type ConsoleType = "log"
    | "warn"
    | "error";

export type ConsoleMethod = (...data: any[]) => void;

export type ToastType = "info"
    | "success"
    | "warning"
    | "error"
    | "default";

export type ToastPosition = "top-left"
    | "top-right"
    | "top-center"
    | "bottom-left"
    | "bottom-right"
    | "bottom-center";

export const ConsoleToastMap: Record<ConsoleType, ToastType> = {
    log: "info" as ToastType,
    warn: "warning" as ToastType,
    error: "error" as ToastType
};

export class ToastComponent {
    private defaultConsoles: Record<ConsoleType, ConsoleMethod> = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };
    private toastConsoles: Set<ConsoleType> = new Set<ConsoleType>(["warn", "error"]); // Default to only warn and error

    private position: ToastPosition = "top-right";
    private closeable: boolean = false;
    private closeTime: number = 2000;
    private progress: boolean = false;
    private hoverPause: boolean = true;

    constructor() {
        this.overrideConsole();
    }

    private overrideConsole() {
        this.toastConsoles.forEach((method: ConsoleType) => {
            if (this.defaultConsoles[method]) {
                this.overrideConsoleMethod(method);
            }
        });
    }

    private overrideConsoleMethod(method: ConsoleType): void {
        console[method] = (...data: any[]) => {
            this.defaultConsoles[method].apply(console, data);
            this.dispatchToast(ConsoleToastMap[method], this.formatConsoleData(data));
        };
    }

    private dispatchToast(type: ToastType, message: string): void {
        new Toast({
            position: this.position,
            toastMsg: message,
            autoCloseTime: this.closeTime,
            canClose: this.closeable,
            showProgress: this.progress,
            pauseOnHover: this.hoverPause,
            pauseOnFocusLoss: false,
            type: type,
            theme: "light" // Change to get from environment later
        })
    }

    private formatConsoleData(data: any[]): string {
        const message = data.map(arg => this.formatConsoleArg(arg)).join(" ");
        return message;
    }

    private formatConsoleArg(arg: any): string {
        if (typeof arg === "object" && arg !== null) {
            try {
                return JSON.stringify(arg);
            }
            catch {
                return String(arg);
            }
        }
        else {
            return String(arg);
        }
    }
}
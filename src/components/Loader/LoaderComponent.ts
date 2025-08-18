import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./LoaderTemplate.html?raw";
import { DotLottie } from "@lottiefiles/dotlottie-web";
import { State } from "../../core/State";
import { Status } from "../../types/Application";

export class LoaderComponent extends BaseComponent {
    private state: State = State.getInstance();
    private canvas?: HTMLCanvasElement;
    private animation?: DotLottie;
    private readonly animationUrl: string = "animations/loader.lottie";

    constructor() {
        super(HTMLtemplate);
        this.initialize();
    }

    onInitialized(): void {
        this.canvas = this.querySelector("canvas") as HTMLCanvasElement | null || undefined;
        if (!this.canvas) return;

        this.animation = new DotLottie({
            loop: true,
            canvas: this.canvas,
            src: this.animationUrl
        });

        // Subscribe for status updates (immediately invoked with current value)
        this.state.subscribeToStatus((status: Status) => this.update(status));
    }

    private update(status: Status): void {
        if (!this.canvas || !this.animation) return;
        if (status === Status.Loading) {
            this.show();
        } else {
            this.hide();
        }
    }

    private show(): void {
        if (!this.canvas || !this.animation) return;
        this.canvas.classList.remove("hidden");
        this.canvas.classList.add("block");

        const box = this.canvas.getBoundingClientRect();
        this.canvas.width = box.width;
        this.canvas.height = box.height;
        this.animation.resize();
        this.animation.play();
    }

    private hide(): void {
        if (!this.canvas || !this.animation) return;
        this.canvas.classList.remove("block");
        this.canvas.classList.add("hidden");
        this.animation.stop();
    }
}

customElements.define("vitax-loader", LoaderComponent);

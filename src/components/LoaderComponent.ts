import { DotLottie } from "@lottiefiles/dotlottie-web";
import { Status } from "../types/Application";
import { Vitax } from "../main";

export class LoaderComponent {
    private container: HTMLCanvasElement;
    private animationUrl: string = "animations/loader.lottie";
    private animation: DotLottie;

    constructor(container: HTMLCanvasElement) {
        this.container = container;
        this.animation = new DotLottie({
            loop: true,
            canvas: this.container,
            src: this.animationUrl
        });
        Vitax.subscribeToStatus((status: Status) => this.updateLoadingStatus(status));
    }

    public updateLoadingStatus(status: Status): void {
        if (status === Status.Loading) {
            this.show();
        }
        else {
            this.hide();
        }
    }

    public show(): void {
        this.container.classList.remove("hidden");
        this.container.classList.add("flex");

        const box = this.container.getBoundingClientRect();
        this.container.width = box.width;
        this.container.height = box.height;
        this.animation.resize();

        this.animation.play();
    }

    public hide(): void {
        this.container.classList.remove("flex");
        this.container.classList.add("hidden");
        this.animation.stop();
    }
}
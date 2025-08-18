import { VisualizationType } from "../../types/Application";
import { BaseComponent } from "../BaseComponent";
import { State } from "../../core/State";
import HTMLtemplate from "./DisplayTypeTemplate.html?raw";

export class DisplayTypeComponent extends BaseComponent {
    private state: State = State.getInstance();
    private nav?: HTMLElement;

    constructor() {
        super(HTMLtemplate);
        this.initialize();
    }

    onInitialized(): void {
        this.nav = this.querySelector("nav") as HTMLElement;
        if (!this.nav) {
            throw new Error("Navigation element not found");
        }

        const currentDisplayType = this.state.getDisplayType();
        Object.values(VisualizationType).forEach((type) => {
            const button = document.createElement("button");
            button.textContent = type;
            button.type = "button";
            button.role = "tab";
            button.id = `display-type-${type.toLowerCase()}`;
            button.setAttribute("aria-controls", `display-type-${type.toLowerCase()}-panel`);
            button.dataset.type = type;
            button.tabIndex = 0;
            button.addEventListener("click", this.onDisplayTypeSelected.bind(this));
            if (type === currentDisplayType) {
                button.ariaSelected = "true";
            }

            this.nav!.appendChild(button);
        });
    }

    private onDisplayTypeSelected(event: MouseEvent): void {
        const button = event.currentTarget as HTMLButtonElement;
        const type = button.dataset.type as VisualizationType;
        if (this.state.getDisplayType() !== type) {
            this.state.setDisplayType(type);
        }
    }
}

customElements.define("display-type", DisplayTypeComponent);
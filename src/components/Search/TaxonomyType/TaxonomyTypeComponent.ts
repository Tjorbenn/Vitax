import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./TaxonomyTypeTemplate.html?raw";
import { State } from "../../../core/State";
import { TaxonomyType } from "../../../types/Application";

export class TaxonomyTypeComponent extends BaseComponent {
    private state: State = State.getInstance();
    private button?: HTMLButtonElement;
    private listbox?: HTMLDivElement;

    constructor() {
        super(HTMLtemplate);
        this.initialize();
    }

    connectedCallback(): void {
        this.addEventListener("change", this.onChange.bind(this));
    }

    onInitialized(): void {
        this.button = this.querySelector("#taxonomy-type-select-button") as HTMLButtonElement;
        this.listbox = this.querySelector("#taxonomy-type-select-listbox") as HTMLDivElement;
        if (!this.button || !this.listbox) {
            throw new Error("Button or listbox element not found");
        }

        const currentTaxonomyType = this.state.getTaxonomyType() as TaxonomyType;

        Object.values(TaxonomyType).forEach((type) => {
            const option = document.createElement("div");
            option.dataset.value = type;
            option.textContent = type;
            option.id = `taxonomy-type-option-${type}`;
            option.role = "option";

            this.listbox!.appendChild(option);
            if (type === currentTaxonomyType) {
                this.button!.ariaActiveDescendantElement = option;
            }
        });
    }

    private onChange(event: Event) {
        const changeEvent = event as CustomEvent;
        const type = changeEvent.detail.value as TaxonomyType;
        this.state.setTaxonomyType(type);
    }
}

customElements.define("taxonomy-type", TaxonomyTypeComponent);

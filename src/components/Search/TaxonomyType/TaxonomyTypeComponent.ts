import { BaseComponent } from "../../BaseComponent";
import HTMLtemplate from "./TaxonomyTypeTemplate.html?raw";
import { State } from "../../../core/State";
import { TaxonomyType } from "../../../types/Application";

export class TaxonomyTypeComponent extends BaseComponent {
    private button?: HTMLButtonElement;
    private label?: HTMLSpanElement;
    private list?: HTMLUListElement;
    private state: State = State.getInstance();

    constructor() {
        super(HTMLtemplate);
        this.loadTemplate();

        this.state.subscribeToTaxonomyType(this.onChange.bind(this));
    }

    initialize(): void {
        this.list = this.querySelector("#taxonomy-type-popover") as HTMLUListElement;
        this.button = this.querySelector("#taxonomy-type-button") as HTMLButtonElement;
        this.label = this.querySelector("#taxonomy-type-label") as HTMLSpanElement;

        if (!this.list || !this.button || !this.label) {
            throw new Error("List, button or label element not found");
        }

        const currentType = this.state.getTaxonomyType() as TaxonomyType;

        if (!currentType) {
            throw new Error("Current taxonomy type not found");
        }

        Object.values(TaxonomyType).forEach((type) => {
            const item = document.createElement("li");
            const anchor = document.createElement("a");
            anchor.dataset.type = type;
            anchor.classList.add("cursor-pointer", "animated");
            if (type === "mrca") {
                anchor.classList.add("uppercase");
            }
            else {
                anchor.classList.add("capitalize");
            }

            if (type === currentType) {
                this.addStatus(anchor);
            }

            anchor.textContent = type;

            anchor.addEventListener("click", this.onClick.bind(this));

            item.appendChild(anchor);
            this.list!.appendChild(item);
        });
    }

    private addStatus(anchor: HTMLAnchorElement) {
        if (anchor.querySelector(".status")) {
            return;
        }
        const status = document.createElement("div");
        status.ariaLabel = "status";
        status.classList.add("status", "status-primary");
        anchor.appendChild(status);
    }

    private removeStatus(anchor: HTMLAnchorElement) {
        const status = anchor.querySelector(".status");
        if (status) {
            status.remove();
        }
    }

    public onChange(type?: TaxonomyType) {
        if (!type) {
            throw new Error("Taxonomy type not found");
        }

        if (!this.list || !this.label) {
            throw new Error("List or label element not found");
        }

        this.label.textContent = type.toString();

        const items = this.list.querySelectorAll("li a") as NodeListOf<HTMLAnchorElement>;
        items.forEach((item) => {
            if (item.dataset.type === type) {
                item.classList.add("selected");
                this.addStatus(item);
            } else {
                item.classList.remove("selected");
                this.removeStatus(item);
            }
        });
    }

    private onClick(event: MouseEvent) {
        const item = event.target as HTMLLIElement;
        if (!this.list || !item) {
            throw new Error("List or list item not found");
        }
        this.state.setTaxonomyType(item.dataset.type as TaxonomyType);
        this.list.hidePopover();
    }
}

customElements.define("taxonomy-type", TaxonomyTypeComponent);

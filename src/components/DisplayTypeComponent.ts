import type { Visualization } from "../types/Application";
import { Vitax } from "../main";

export class DisplayTypeComponent {
    private fieldset: HTMLFieldSetElement;

    constructor(fieldset: HTMLFieldSetElement) {
        this.fieldset = fieldset;
        this.fieldset.addEventListener("change", this.handleChange.bind(this));
    }

    getValue(): Visualization {
        const radios = this.fieldset.querySelectorAll('input[type="radio"]');
        for (const radio of radios) {
            if ((radio as HTMLInputElement).checked) {
                return (radio as HTMLInputElement).value as Visualization;
            }
        }
        throw new Error("No display type selected.");
    }

    handleChange(event: Event): void {
        const newValue = this.getValue() as Visualization;
        Vitax.setDisplayType(newValue);
    }
}
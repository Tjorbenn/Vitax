import { VisualizationType } from "../types/Application";
import { Vitax } from "../main";

export class DisplayTypeComponent {
    private fieldset: HTMLFieldSetElement;

    constructor(fieldset: HTMLFieldSetElement) {
        this.fieldset = fieldset;
        this.fieldset.addEventListener("change", this.handleChange.bind(this));
        Vitax.setDisplayType(this.getDisplayType());
    }

    public getDisplayType(): VisualizationType {
        const radios = this.fieldset.querySelectorAll('input[type="radio"]');
        for (const radio of radios) {
            if ((radio as HTMLInputElement).checked) {
                return (radio as HTMLInputElement).value as VisualizationType;
            }
        }
        throw new Error("No display type selected.");
    }

    public setDisplayType(value: VisualizationType): void {
        const radios = this.fieldset.querySelectorAll('input[type="radio"]');
        for (const radio of radios) {
            if ((radio as HTMLInputElement).value === value) {
                (radio as HTMLInputElement).checked = true;
                return;
            }
        }
        throw new Error(`Display type ${value} not found in fieldset.`);
    }

    private handleChange(): void {
        const newValue = this.getDisplayType();
        Vitax.setDisplayType(newValue);
    }
}
export class TaxonomyTypeComponent {
    private fieldset: HTMLFieldSetElement;

    constructor(fieldset: HTMLFieldSetElement) {
        this.fieldset = fieldset;
    }

    public getValue(): string {
        const radios = this.fieldset.querySelectorAll("input[type='radio']");
        for (const radio of radios) {
            if ((radio as HTMLInputElement).checked) {
                return (radio as HTMLInputElement).value;
            }
        }
        return "";
    }
}
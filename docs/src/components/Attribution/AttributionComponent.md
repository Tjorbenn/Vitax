
```ts
import { BaseComponent } from "../BaseComponent";
import HTMLtemplate from "./AttributionTemplate.html?raw";

export class AttributionComponent extends BaseComponent {

    constructor() {
        super(HTMLtemplate);
        this.loadTemplate();
    }
}

customElements.define("vitax-attribution", AttributionComponent);
```

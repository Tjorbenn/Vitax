import "./style.css";
import { Application } from "./core/Application";
import { DisplayTypeComponent } from "./components/DisplayTypeComponent";
import { SearchComponent } from "./components/SearchComponent";
import { TaxonomyTypeComponent } from "./components/TaxonomyTypeComponent";
import { VisualizationComponent } from "./components/VisualizationComponent";

// UI-Components
const displayTypeComponent = new DisplayTypeComponent(document.getElementById("display-type") as HTMLFieldSetElement);
const searchComponent = new SearchComponent(document.querySelector("search") as HTMLElement, document.getElementById("suggestions-container") as HTMLDivElement);
const taxonomyTypeComponent = new TaxonomyTypeComponent(document.getElementById("taxonomy-type") as HTMLFieldSetElement);
const visualizationComponent = new VisualizationComponent(document.getElementById("visualization-container") as HTMLDivElement);

// Singleton instance of Application
export const Vitax = new Application(searchComponent, taxonomyTypeComponent, displayTypeComponent, visualizationComponent);
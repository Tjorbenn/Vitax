import "./style.css";
import { Application } from "./core/Application";
import { DisplayTypeComponent } from "./components/DisplayTypeComponent";
import { SearchComponent } from "./components/SearchComponent";
import { VisualizationComponent } from "./components/VisualizationComponent";
import { BuildComponent } from "./components/BuildComponent";

// UI-Components
const displayTypeComponent = new DisplayTypeComponent(document.getElementById("display-type") as HTMLFieldSetElement);
const searchComponent = new SearchComponent(document.querySelector("search") as HTMLElement, document.getElementById("suggestions-container") as HTMLDivElement);
const visualizationComponent = new VisualizationComponent(document.getElementById("visualization-container") as HTMLDivElement);
new BuildComponent(document.getElementById("build-hash") as HTMLDivElement);

// Singleton instance of Application
export const Vitax = new Application(searchComponent, displayTypeComponent, visualizationComponent);
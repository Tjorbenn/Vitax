import "./style.css";
import { Application } from "./core/Application";
import { DisplayTypeComponent } from "./components/DisplayTypeComponent";
import { SearchComponent } from "./components/SearchComponent";
import { VisualizationComponent } from "./components/VisualizationComponent";
import { DataListComponent } from "./components/DataListComponent";
import { BuildComponent } from "./components/BuildComponent";
import { DraggableWindowsComponent } from "./components/DraggableWindowsComponent";
import { LoaderComponent } from "./components/LoaderComponent";

// Singleton instance of Application
export const Vitax = new Application();

// UI-Components
const displayTypeComponent = new DisplayTypeComponent(document.getElementById("display-type") as HTMLFieldSetElement);
const searchComponent = new SearchComponent(document.querySelector("search") as HTMLElement, document.getElementById("suggestions-container") as HTMLDivElement);
const visualizationComponent = new VisualizationComponent(document.getElementById("visualization-container") as HTMLDivElement);
const dataListComponent = new DataListComponent(document.getElementById("data-window-content") as HTMLDivElement);
const loaderComponent = new LoaderComponent(document.getElementById("loader-canvas") as HTMLCanvasElement);

Vitax.setDisplayTypeComponent(displayTypeComponent);
Vitax.setSearchComponent(searchComponent);
Vitax.setVisualizationComponent(visualizationComponent);
Vitax.setDataListComponent(dataListComponent);
Vitax.setLoaderComponent(loaderComponent);

new BuildComponent(document.getElementById("build-hash") as HTMLDivElement);
new DraggableWindowsComponent(document.querySelectorAll(".draggable") as NodeListOf<HTMLElement>);

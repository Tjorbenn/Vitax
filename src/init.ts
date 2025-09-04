import "./styles/main.css";
import "./utility/Set.ts";

// Core

// Features
import { initDraggableWindows } from "./features/DraggableWindows";
import { handleKeyCombos } from "./features/KeyCombos.ts";
import { runTutorial } from "./features/Tutorial.ts";

// Components
import "./components/Attribution/AttributionComponent.ts";
import "./components/DisplayType/DisplayTypeComponent.ts";
import "./components/List/ListComponent.ts";
import "./components/Search/SearchComponent.ts";
import "./components/Theme/ThemeComponent.ts";
import "./components/Title/TitleComponent.ts";
import "./components/Version/VersionComponent.ts";
import "./components/Visualization/TaxonPopover/TaxonPopoverComponent.ts";
import "./components/Visualization/VisualizationComponent.ts";

// Features
document.addEventListener("keydown", handleKeyCombos);
initDraggableWindows();
runTutorial();

import "./styles/main.css";
import "./utility/Set.ts";

// Core
import { Router } from "./core/Routing.ts";

// Features
import { handleKeyCombos } from "./features/KeyCombos.ts";
import { initDraggableWindows } from "./features/DraggableWindows";

// Components
import "./components/DisplayType/DisplayTypeComponent.ts";
import "./components/Title/TitleComponent.ts";
import "./components/Attribution/AttributionComponent.ts";
import "./components/Version/VersionComponent.ts";
import "./components/Search/SearchComponent.ts";
import "./components/Visualization/VisualizationComponent.ts";
import "./components/Visualization/TaxonPopover/TaxonPopoverComponent.ts";
import "./components/Theme/ThemeComponent.ts";

// Features
document.addEventListener("keydown", handleKeyCombos);
initDraggableWindows();
Router.getInstance().setupRouting();

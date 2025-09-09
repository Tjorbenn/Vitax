import "./styles/main.css";
import "./utility/Set.ts";

// Core
import { Router } from "./core/Routing.ts";

// Features
import { handleKeyCombos } from "./features/KeyCombos.ts";

// Components
import "./components/Attribution/AttributionComponent.ts";
import "./components/DisplayType/DisplayTypeComponent.ts";
import "./components/List/ListComponent.ts";
import "./components/References/ReferencesComponent.ts";
import "./components/Search/SearchComponent.ts";
import "./components/Theme/ThemeComponent.ts";
import "./components/Title/TitleComponent.ts";
import "./components/Tutorial/TutorialComponent.ts";
import "./components/Version/VersionComponent.ts";
import "./components/Visualization/TaxonPopover/TaxonPopoverComponent.ts";
import "./components/Visualization/VisualizationComponent.ts";
import "./components/Welcome/WelcomeComponent.ts";

// Core
Router.initRouting();

// Features
document.addEventListener("keydown", handleKeyCombos);

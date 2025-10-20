import "./styles/main.css";

// Register global utilities
import "./utility/registerGlobals.ts";

// Core
import * as Router from "./core/Routing.ts";
import * as State from "./core/State.ts";

// Features
import { handleKeyCombos } from "./features/KeyCombos.ts";

// Components
import "./components/AccessionFilter/AccessionFilterComponent.ts";
import "./components/Attribution/AttributionComponent.ts";
import "./components/DisplayType/DisplayTypeComponent.ts";
import "./components/List/ListComponent.ts";
import "./components/Metadata/MetadataModal/MetadataModal.ts";
import "./components/Search/SearchComponent.ts";
import "./components/Theme/ThemeComponent.ts";
import "./components/Title/TitleComponent.ts";
import "./components/Tutorial/TutorialComponent.ts";
import "./components/Version/VersionComponent.ts";
import "./components/Visualization/TaxonAction/TaxonActionComponent.ts";
import "./components/Visualization/VisualizationComponent.ts";
import "./components/Welcome/WelcomeComponent.ts";

// Core initialization
State.init();
Router.initRouting();

// Features
document.addEventListener("keydown", handleKeyCombos);

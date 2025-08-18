import "./styles/main.css";
import "basecoat-css/all";

// Features
import { initDraggableWindows } from "./features/DraggableWindows";

// Components
import "./components/DisplayType/DisplayTypeComponent.ts";
import "./components/Title/TitleComponent.ts";
import "./components/Attribution/AttributionComponent.ts";
import "./components/Version/VersionComponent.ts";
import "./components/Loader/LoaderComponent.ts";
import "./components/Search/SearchComponent.ts";

// Features
initDraggableWindows();

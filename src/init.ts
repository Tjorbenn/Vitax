/**
 * Application Entry Point.
 */
import "./styles/main.css";

// Unregister service workers and clear client-side caches once to avoid the caching issues from the old PWA config
if (localStorage.getItem("vitax.cache_cleaned_v1") !== "true") {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister().then((success) => {
          if (success) {
            console.log("Successfully unregistered service worker:", registration);
          }
        });
      }
    });
  }
  if ("caches" in window) {
    void caches.keys().then((names) => {
      for (const name of names) {
        void caches.delete(name).then((success) => {
          if (success) {
            console.log("Successfully deleted cache:", name);
          }
        });
      }
    });
  }
  localStorage.setItem("vitax.cache_cleaned_v1", "true");
}

// Core
import * as Router from "./core/Routing.ts";
import * as State from "./core/State.ts";

// Features
import { handleKeyCombos } from "./features/KeyCombos.ts";
import * as Settings from "./features/Settings.ts";

// Components
import "./components/AccessionFilter/AccessionFilterComponent.ts";
import "./components/Legend/LegendComponent.ts";
import "./components/List/ListComponent.ts";
import "./components/Metadata/MetadataModal/MetadataModal.ts";
import "./components/Search/SearchComponent.ts";
import "./components/Settings/SettingsButtonComponent.ts";
import "./components/Settings/SettingsModal.ts";
import "./components/Title/TitleComponent.ts";
import "./components/Visualization/ImageButtonComponent.ts";
import "./components/Visualization/TaxonAction/TaxonActionComponent.ts";
import "./components/Visualization/VisualizationComponent.ts";
import "./components/VisualizationType/VisualizationTypeComponent.ts";
import "./components/Welcome/WelcomeComponent.ts";

// Core initialization
State.init();
Settings.init();
Router.initRouting();

// Features
document.addEventListener("keydown", handleKeyCombos);

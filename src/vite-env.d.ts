/// <reference types="vite/client" />

import type { TaxonomyType, VisualizationType } from "./types/Application";

interface ImportMetaEnv {
  readonly VITAX_TAXONOMYTYPE_DEFAULT: TaxonomyType;
  readonly VITAX_DISPLAYTYPE_DEFAULT: VisualizationType;
  readonly VITAX_DEBOUNCE_TIME: number;
  readonly VITAX_SUGGESTIONS_PAGESIZE: number;
  readonly VITAX_GITHUB_USER: string;
  readonly VITAX_GITHUB_REPO: string;
  readonly VITAX_ANIMATION_DURATION: number;
  readonly VITAX_VERSION_MAJOR: number;
  readonly VITAX_VERSION_MINOR: number;
  readonly VITAX_VERSION_PATCH: number;
  readonly VITAX_BASE_TILE_SIZE: number;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

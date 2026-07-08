/**
 * Type definitions for Vite environment variables.
 * Ensures type safety for import.meta.env usage across the application.
 */
/// <reference types="vite-plus/client" />

import type { TaxonomyType, VisualizationType } from "./types/Application";

type ImportMetaEnv = {
  readonly VITAX_TAXONOMYTYPE_DEFAULT: TaxonomyType;
  readonly VITAX_DISPLAYTYPE_DEFAULT: VisualizationType;
  readonly VITAX_DEBOUNCE_TIME: number;
  readonly VITAX_SUGGESTIONS_PAGESIZE: number;
  readonly VITAX_GITHUB_USER: string;
  readonly VITAX_GITHUB_REPO: string;
  readonly VITAX_ANIMATION_DURATION: number;
  readonly VITAX_VERSION: string;
  readonly VITAX_COMMIT_HASH: string;
  readonly VITAX_BASE_TILE_SIZE: number;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};

<div align="center">
  <img src="public/images/logo.svg" alt="Vitax Logo" width="200"/>
  <h1 align="center">Vitax</h1>
  <p align="center">
    Visualizing the NCBI Taxonomy
  </p>
  <p align="center">
    <a href="https://github.com/Tjorbenn/Vitax/actions/workflows/Build.yml"><img src="https://github.com/Tjorbenn/Vitax/actions/workflows/Build.yml/badge.svg" alt="Build Status"></a>
    <a href="https://github.com/Tjorbenn/Vitax/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Tjorbenn/Vitax" alt="License"></a>
    <a href="https://github.com/Tjorbenn/Vitax/releases"><img src="https://img.shields.io/github/v/release/Tjorbenn/Vitax" alt="Version"></a>
  </p>
</div>

## Introduction

Vitax is an intuitive web application designed for scientists, researchers, and students alike who need to explore and understand the complex relationships between biological taxa. The application provides a user-friendly interface for searching and visualizing a wide range of taxonomic information in various formats.

## Features

- **Multiple types of relationships / taxonomic data:** Investigate different types of taxonomic relationships, including:
  - **Neighbors:** Displays the the taxonomic neighbors of a group of target taxa.
  - **Descendants:** Shows the descendants of a taxon.
  - **Most Recent Common Ancestor (MRCA):** Shows the most recent common ancestor of a group of target taxa and their connecting lineage.

- **Interactive Visualizations:** Explore taxonomic relationships through a variety of interactive visualizations, including:
  - **Tree:** A classic hierarchical view of the taxonomic tree. (_Implemented_)
  - **Graph:** A network graph that shows the relationships between taxa. (_To be implemented_)
  - **Pack:** A visualization that packs taxa into a circle. (_To be implemented_)
  - When a taxon is focused via the list, the visualization briefly highlights the node with a subtle pulse effect to help locate it.
- **Powerful Search:** Quickly find any taxon of interest with the powerful search functionality.
- **Suggestions:** Get suggestions as you type to help you find the right taxon.
- **Data Sources:**
  - **[Never API](https://neighbors.evolbio.mpg.de):** Vitax uses the Never API to provide the taxonomic relationship as well as taxonomic metadata. The Never API is a custom API developed by the [Research Group for Bioinformatics](https://neighbors.evolbio.mpg.de) of the [Max-Planck-Institute for Evolutionary Biology](https://www.evolbio.mpg.de) that provides access to the taxonomic data from the [NCBI Taxonomy](https://www.ncbi.nlm.nih.gov/taxonomy).
  - **[NCBI Taxonomy](https://www.ncbi.nlm.nih.gov/datasets/docs/v2/api/rest-api/):** Vitax uses the NCBI Taxonomy API to add additional metadata. This includes images as well as links to external resources.
  - **[SemanticScholar](https://www.semanticscholar.org/product/api):** Vitax uses the SemanticScholar API to add publication data to taxa.

## Live Demo

A live demo of the application is available on the website of the [Research Group for Bioinformatics](https://neighbors.evolbio.mpg.de/vitax).

## Getting Started

To get started with Vitax, you will need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed on your machine.

1.  Clone the repository:

```bash
git clone https://github.com/Tjorbenn/Vitax.git
```

2.  Install the dependencies:

```bash
cd Vitax
npm install
```

3.  Run the application:

```bash
npm run dev
```

4. Build the application for production:

```bash
npm run build
```

The application will be available at `http://localhost:5173`.

## Usage

1.  Enter a taxon name in the search box.
2.  Select a taxon from the suggestions list (or press Enter to search for the entered name).
3.  Choose a visualization type from the display type component.
4.  The visualization will be displayed in the visualization component.

## Architecture

Vitax is built in [TypeScript](https://www.typescriptlang.org/), uses [Vite](https://vite.dev) as the build tool, and [TailwindCSS](https://tailwindcss.com/) for styling. [D3.js](https://d3js.org/) is used for creating the data visualizations.

## Built With

- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [DaisyUI](https://daisyui.com)
- [TailwindCSS](https://tailwindcss.com/)
- [D3.js](https://d3js.org/)

## License

This project is licensed under the MIT License. See the `LICENSE` file for more information.

## Contact

Tjorben – [@Tjorbenn](https://github.com/Tjorbenn)

Project Link: [https://github.com/Tjorbenn/Vitax](https://github.com/Tjorbenn/Vitax)

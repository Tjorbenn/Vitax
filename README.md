<div align="center">
  <img src="public/images/logo_green.svg" alt="Vitax Logo" width="200"/>
  <h1 align="center">Vitax</h1>
  <p align="center">
    Visualizing the NCBI Taxonomy
  </p>
  <p align="center">
    <a href="https://github.com/Tjorbenn/Vitax/actions/workflows/Build.yml"><img src="https://github.com/Tjorbenn/Vitax/actions/workflows/Build.yml/badge.svg" alt="Build Status"></a>
    <a href="https://github.com/Tjorbenn/Vitax/releases"><img src="https://img.shields.io/github/v/release/Tjorbenn/Vitax" alt="Latest Release"></a>
    <a href="https://github.com/Tjorbenn/Vitax/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Tjorbenn/Vitax" alt="License"></a>
  </p>
</div>

## Introduction

Vitax is a web application for exploring and working with the NCBI Taxonomy in a visual way.
It provides a user-friendly interface for searching and visualizing a wide range of taxonomic information in various formats.

One of its key features is direct access to genome accessions from within the visualization, which enables a visual interface for genomic analysis based on the taxonomy.

## Features

- **Multiple types of relationships / taxonomic data:** Investigate different types of taxonomic relationships, including:
  - **Neighbors:** Displays the the taxonomic neighbors of a group of target taxa.
  - **Descendants:** Shows the descendants of a taxon.
  - **Most Recent Common Ancestor (MRCA):** Shows the most recent common ancestor of a group of target taxa and their connecting lineage.
- **Suggestions:** Quickly find any taxon of interest with autocomplete suggestions as you type.
- **Interactive Visualizations:** Explore taxonomic relationships through a variety of interactive visualizations, including:
  - **Tree:** A classic hierarchical view of the taxonomic tree.
  - **Graph:** A network graph that shows the relationships between taxa.
  - **Pack:** A space-efficient circle packing visualiztion, where taxa are represented as circles packed hierarchically.
  - Find any taxon in the visualization from a hierarchical list.
  - Get metadata for any taxon right from the visualization.
- **Genome Accessions:** Access genome accessions for any taxon in the visualization.
- **Data Sources:**
  - **[Never API](https://neighbors.evolbio.mpg.de):** Vitax uses the Never API to provide the taxonomic relationship as well as taxonomic metadata. The Never API is a custom API developed by the [Research Group for Bioinformatics](https://neighbors.evolbio.mpg.de) of the [Max-Planck-Institute for Evolutionary Biology](https://www.evolbio.mpg.de) that provides access to the taxonomic data from the [NCBI Taxonomy](https://www.ncbi.nlm.nih.gov/taxonomy).
  - **[NCBI Taxonomy](https://www.ncbi.nlm.nih.gov/datasets/docs/v2/api/rest-api/):** Vitax uses the NCBI Taxonomy API to add additional metadata. This includes images as well as links to external resources.
  - **[SemanticScholar](https://www.semanticscholar.org/product/api):** Vitax uses the SemanticScholar API to add publication data to taxa.

## Live Demo

A live demo of the application is available on the website of the [Research Group for Bioinformatics](https://neighbors.evolbio.mpg.de/vitax).

## Usage

1.  Enter a taxon name in the search box.
2.  Select a taxon from the suggestions list (or press Enter to select the entered taxon if it exists). Repeat for additional taxa.
3.  Choose a visualization type from the display type component.
4.  Press "Visualize" to generate the visualization.

## Architecture

Vitax is built in [TypeScript](https://www.typescriptlang.org/), uses [Vite](https://vite.dev) as the build tool, and [DaisyUI](https://daisyui.com) combined with [TailwindCSS](https://tailwindcss.com/) for styling. [D3.js](https://d3js.org/) is used for creating the data visualizations.

## Development

To get started with Vitax, follow the steps below to set up the project on your local machine.

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Latest LTS version recommended)
- [npm](https://www.npmjs.com/) (Included with Node.js)

### Installation

1.  Clone the repository:

```bash
git clone https://github.com/Tjorbenn/Vitax.git
cd Vitax
```

2.  Install the dependencies:

```bash
npm install
```

### Environment Setup

The project uses a `.env` file for configuration. A default `.env` file is included in the repository.

To override these defaults locally, create a `.env.local` file in the root directory or modify the `.env` file:

```bash
cp .env .env.local
```

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Development Workflow

Here are some common commands used during development:

- **Linting:** Check for implementation errors and potential bugs.

  ```bash
  npm run lint
  ```

  To automatically fix linting issues:

  ```bash
  npm run lint:fix
  ```

- **Formatting:** Check if code adheres to the defined formatting style.
  ```bash
  npm run format
  ```
  To automatically format code:
  ```bash
  npm run format:fix
  ```

### Building for Production

To build the application for production:

```bash
npm run build
```

You can preview the production build locally using:

```bash
npm run preview
```

Or you can use your own web server of choice to serve the `dist` directory that is created when running `npm run build`.

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

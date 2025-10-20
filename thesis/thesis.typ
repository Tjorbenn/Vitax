#import "@preview/minimal-thesis-luebeck:0.4.0": *
#import "@preview/drafting:0.2.2": *
#import "@preview/zebraw:0.5.5": *
#import "@preview/glossarium:0.5.9": make-glossary, register-glossary, print-glossary, gls, glspl

#show: zebraw
#show: make-glossary

#import "glossary.typ": entry-list

#show: thesis.with(
  title-english: "Vitax — Visualizing the NCBI Taxonomy",
  title-german: "Vitax — Visualisierung der NCBI Taxonomie",
  language: "en", // use "de" for german documents
  author: "Tjorben Nawroth",
  degree: "Master", // or "Bachelor"
  submission-date: datetime.today(), // or use: datetime(day: 1, month: 1, year: 2025)
  institute: "Max-Planck-Institut für Evolutionsbiologie",
  program: "Molecular Life Science",
  university: "Universität zu Lübeck",
  supervisor: "Prof. Dr. Bernhard Haubold",
  advisor: "TO BE DETERMINED",
  place: "Plön",
  top-left-img: image("images/Logo_UzL_small.svg", height: 4cm),
  top-right-img: image("images/Logo_MPI-EB_small.svg", height: 4cm),
  acknowledgement-text: include "texts/acknowledgement.typ",
  appendix: include "texts/appendix.typ",
  abstract-en: include "texts/abstract-en.typ",
  abstract-de: include "texts/abstract-de.typ",
  bib-file: bibliography("thesis.bib"),
  body-font: "Libertinus Serif",
  sans-font: "Libertinus Sans",
  dark-color: rgb(0, 39, 102),
  light-color: rgb(0, 145, 247),
  is-print: false,
  make-list-of-figures: false,
  make-list-of-tables: false,
)

#register-glossary(entry-list)

= Preface
== A Note on this Document's Format
This thesis partly contains a _literate program_, meaning that this document is generated from a source file containing both the narrative text and the complete, executable source code for the Vitax application.
It is written using the _Typst_ typesetting system with interspersed code chunks containing mainly @html, @css and @ts.
- To produce this document, the source file had to be _weaved_, which means that the code chunks are printed into the document in a beautified form and automatically linked to each other and references in the text.
- To produce the executable application, the source file had to be _tangled_, which means that the code chunks are extracted and put together in a, for a computer, syntactically correct way.

= Introduction

== The NCBI Taxonomy

== The Importance of Taxonomy in Modern Biology

== The Challenge of Navigating Taxonomic Data

== Project Goals and Scope

== Thesis Structure

= Background and Fundamentals

== The NCBI Taxonomy Database

== Principles of Hierarchical Visualization

== Core Technologies

=== The _Never_ Web Service and _Neighbors_ Package

=== Frontend Web Technologies

=== Literate Programming and _Typst_

= Implementation of Vitax

== Initial Prototyping

=== Go as WebAssembly

=== TypeScript with _D3.js_

== The Final Architecture of Vitax

== Implementation

=== Foundation Layer

==== Type System

#include "docs/src/types/Application.typ"

#include "docs/src/types/Taxonomy.typ"

#include "docs/src/types/UI.typ"

==== Utility Layer

#include "docs/src/utility/Observable.typ"

#include "docs/src/utility/Events.typ"

#include "docs/src/utility/Dom.typ"

#include "docs/src/utility/Environment.typ"

=== State Machine

#include "docs/src/core/State.typ"

=== Orchestration Layer

==== Data Flow Orchestration

#include "docs/src/core/Orchestrator.typ"

==== Routing

#include "docs/src/core/Routing.typ"

=== Data Services & APIs

#include "docs/src/api/Never/Never.typ"

#include "docs/src/api/Never/NeverClient.typ"

#include "docs/src/api/NCBI/Ncbi.typ"

#include "docs/src/api/NCBI/NcbiClient.typ"

#include "docs/src/api/SemanticScholar/SemanticScholar.typ"

#include "docs/src/api/SemanticScholar/SemanticScholarClient.typ"

#include "docs/src/services/TaxonomyService.typ"

#include "docs/src/services/SuggestionsService.typ"

=== Component Architecture

==== Base Architecture

#include "docs/src/components/BaseComponent.typ"

==== Component Hierarchy

===== Atomic Components

#include "docs/src/components/Theme/ThemeComponent.typ"

#include "docs/src/components/Version/VersionComponent.typ"

===== Interactive Components

#include "docs/src/components/Search/SearchComponent.typ"

#include "docs/src/components/DisplayType/DisplayTypeComponent.typ"

#include "docs/src/components/AccessionFilter/AccessionFilterComponent.typ"

===== Data Display Components

#include "docs/src/components/List/ListComponent.typ"

#include "docs/src/components/Metadata/MetadataModal/MetadataModal.typ"

===== Integrative Components

#include "docs/src/components/Welcome/WelcomeComponent.typ"

#include "docs/src/components/Visualization/VisualizationComponent.typ"

=== Visualization Engine

#include "docs/src/visualizations/d3Visualization.typ"

#include "docs/src/visualizations/VisualizationFactory.typ"

==== Renderers

#include "docs/src/visualizations/renderers/d3Tree.typ"

#include "docs/src/visualizations/renderers/d3Graph.typ"

#include "docs/src/visualizations/renderers/d3Pack.typ"

=== Features & UX Enhancements

#include "docs/src/features/DisplayAnimations.typ"

#include "docs/src/features/KeyCombos.typ"

#include "docs/src/features/Download.typ"

#include "docs/src/features/Tutorial.typ"

=== Application Bootstrap

#include "docs/src/init.typ"

= Results

== The Vitax Web application

== Evaluation of Frontend Approaches

== Writing a Thesis using _Litty_

= Discussion

== Interpretation of Results

== Limitations of the Current Work

== Future Work and Potential Enhancements

= Conclusion

= Glossary

#print-glossary(entry-list)

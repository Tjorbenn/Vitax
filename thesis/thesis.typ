#import "@preview/minimal-thesis-luebeck:0.4.0": *
#import "@preview/glossarium:0.5.9": gls, glspl, make-glossary, print-glossary, register-glossary
#import "@preview/drafting:0.2.2": *

#show: make-glossary

#let entry-list = (
  // Organizations
  (
    key: "mpg",
    group: "Organizations",
    short: "MPG",
    long: "Max-Planck-Gesellschaft",
    description: [
      A German research organization.
    ],
  ),
  (
    key: "uzl",
    group: "Organizations",
    short: "UzL",
    long: "Universität zu Lübeck",
    description: [
      A university located in Lübeck, Germany.
    ],
  ),
  (
    key: "ncbi",
    group: "Organizations",
    long: "National Center for Biotechnology Information",
    description: [
      A part of the United States National Library of Medicine, it houses a number of databases relevant to biotechnology and biomedicine.
    ],
  ),
  (
    key: "embl",
    group: "Organizations",
    short: "EMBL",
    long: "European Molecular Biology Laboratory",
    description: [
      An intergovernmental organization dedicated to molecular biology research.
    ],
  ),
  (
    key: "ebi",
    group: "Organizations",
    long: "European Bioinformatics Institute",
    description: [
      A part of the European Molecular Biology Laboratory, it provides bioinformatics services to the global research community.
    ],
  ),
  // Biology
  (
    key: "taxonomy",
    group: "Biology",
    long: "taxonomy",
    description: [
      The science of classification of living organisms.
    ],
  ),
  (
    key: "taxon",
    group: "Biology",
    long: "taxon",
    longplural: "taxa",
    description: [
      A taxonomic unit at any rank.
    ],
  ),
  (
    key: "taxid",
    group: "Biology",
    short: "TaxID",
    long: "taxonomic identifier",
    description: [
      A unique identifier assigned to a taxon.
    ],
  ),
  (
    key: "phylogeny",
    group: "Biology",
    long: "phylogeny",
    description: [
      The evolutionary history and relationships among individuals or groups of organisms.
    ],
  ),
  // Web
  (
    key: "dom",
    group: "Web",
    short: "DOM",
    long: "Document Object Model",
    description: [
      A programming interface for web documents.
    ],
  ),
  (
    key: "html",
    group: "Web",
    short: "HTML",
    long: "HyperText Markup Language",
    description: [
      The standard markup language for documents designed to be displayed in a web browser.
    ],
  ),
  (
    key: "css",
    group: "Web",
    short: "CSS",
    long: "Cascading Style Sheets",
    description: [
      A style sheet language used for describing the presentation of a document written in HTML or XML.
    ],
  ),
  (
    key: "js",
    group: "Web",
    short: "JS",
    long: "JavaScript",
    description: [
      A high-level, dynamic, untyped, and interpreted programming language that can run in web browsers and has native access to the Document Object Model.
    ],
  ),
  (
    key: "ts",
    group: "Web",
    short: "TS",
    long: "TypeScript",
    description: [
      A programming language developed and maintained by Microsoft that is a strict syntactical superset of JavaScript.
    ],
  ),
  (
    key: "json",
    group: "Web",
    short: "JSON",
    long: "JavaScript Object Notation",
    description: [
      A lightweight data interchange format that is easy for humans to read and write and easy for machines to parse and generate."
    ],
  ),
  // Software engineering
  (
    key: "oop",
    group: "Software engineering",
    short: "OOP",
    long: "Object-Oriented Programming",
    description: [
      A programming paradigm based on the concept of "objects", which can contain data and code: data in the form of fields (often known as attributes or properties), and code, in the form of procedures (often known as methods).
    ],
  ),
  (
    key: "var",
    group: "Software engineering",
    long: "variable",
    description: [
      A storage location identified by a memory address and an associated symbolic name (an identifier), which contains some known or unknown quantity of information referred to as a value.
    ],
  ),
  (
    key: "pointer",
    group: "Software engineering",
    long: "pointer",
    description: [
      A variable that stores the memory address of another variable.
    ],
  ),
  (
    key: "type",
    group: "Software engineering",
    long: "type",
    description: [
      A classification that specifies which kind of value a variable can hold.
    ],
  ),
  (
    key: "interface",
    group: "Software engineering",
    long: "interface",
    description: [
      - A contract that defines the shape of an object.
      - A contract that defines the methods and properties a class must implement.
    ],
  ),
  (
    key: "shape",
    group: "Software engineering",
    long: "shape",
    description: [
      The structure of an object, including its properties and their types.
    ],
  ),
  (
    key: "object",
    group: "Software engineering",
    long: "object",
    description: [
      An entity that has state, behaviour and identity.
    ],
  ),
  (
    key: "class",
    group: "Software engineering",
    long: "class",
    description: [
      A blueprint for creating objects in object-oriented programming.
    ],
  ),
  (
    key: "inheritance",
    group: "Software engineering",
    long: "inheritance",
    description: [
      A mechanism in object-oriented programming that allows a new class to inherit properties and methods from an existing class.
    ],
  ),
  (
    key: "api",
    group: "Software engineering",
    short: "API",
    long: "Application Programming Interface",
    description: [
      A set of functions and procedures that allow the creation of applications that access the features or data of an operating system, application, or other service.
    ],
  ),
  // Design
  (
    key: "ui",
    group: "Design",
    short: "UI",
    long: "User Interface",
    description: [
      The space where interactions between humans and machines occur.
    ],
  ),
  (
    key: "ux",
    group: "Design",
    short: "UX",
    long: "User Experience",
    description: [
      A person's emotions and attitudes about using a particular product, system, or service.
    ],
  ),
  // Concepts
  (
    key: "abstraction",
    group: "Concepts",
    long: "abstraction",
    description: [
      The process of generalizing rules and concepts from specific examples.
    ],
  ),
)

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

=== Taxon Search and Selection

=== Visualization

=== Interactivity and Data Access

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

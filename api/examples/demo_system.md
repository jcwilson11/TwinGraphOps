# TwinGraphOps Demo Manual

## Overview

TwinGraphOps ingests technical documentation, extracts component dependencies, stores the resulting graph in Neo4j, and computes graph-based risk to support dependency and blast-radius analysis.

## Components

- Frontend
  - Type: software
  - Responsibilities: Collect uploads and render graph and risk results.
  - Upstream dependencies: User browser input.
  - Downstream dependencies: API

- API
  - Type: software
  - Responsibilities: Accept uploads, orchestrate Gemini extraction, and serve graph queries.
  - Upstream dependencies: Frontend
  - Downstream dependencies: Graph Service, Risk Service

- Graph Service
  - Type: software
  - Responsibilities: Merge extracted graph objects and persist them.
  - Upstream dependencies: API, Risk Service
  - Downstream dependencies: Neo4j

- Risk Service
  - Type: software
  - Responsibilities: Compute heuristic risk and blast radius.
  - Upstream dependencies: API
  - Downstream dependencies: Graph Service

- Neo4j
  - Type: data
  - Responsibilities: Store the dependency graph.
  - Upstream dependencies: Graph Service
  - Downstream dependencies: None

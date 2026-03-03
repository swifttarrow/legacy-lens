# LegacyLens

## Building RAG Systems for Legacy Enterprise Codebases

---

## Before You Start: Pre-Search (60 Minutes)

Before writing any code, complete the Pre-Search methodology at the end of this document.
This structured process uses AI to explore vector database options, embedding strategies, and RAG architecture decisions. Your Pre-Search output becomes part of your final submission.

This week emphasizes RAG architecture selection and implementation. Pre-Search helps you choose the right vector database and retrieval strategy for your use case.

---

## Background

Enterprise systems running on COBOL, Fortran, and other legacy languages power critical infrastructure: banking transactions, insurance claims, government services, and scientific computing. These codebases contain decades of business logic, but few engineers understand them.

This project requires you to build a RAG-powered system that makes large legacy codebases queryable and understandable. You will work with real open source enterprise projects, implementing retrieval pipelines that help developers navigate unfamiliar code through natural language.

The focus is on RAG architecture—vector databases, embedding strategies, chunking approaches, and retrieval pipelines that actually work on complex codebases.

**Gate:** Behavioral and technical interviews required for Austin admission.

---

# Project Overview

One-week sprint with three deadlines:

| Checkpoint  | Deadline           | Focus                             |
| ----------- | ------------------ | --------------------------------- |
| MVP         | Tuesday (24 hours) | Basic RAG pipeline working        |
| Final (G4)  | Wednesday (3 days) | Polish, documentation, deployment |
| Final (GFA) | Sunday (5 days)    | Polish, documentation, deployment |

---

## MVP Requirements (24 Hours)

**Hard gate. All items required to pass:**

* ☐ Ingest at least one legacy codebase (COBOL, Fortran, or similar)
* ☐ Chunk code files with syntax-aware splitting
* ☐ Generate embeddings for all chunks
* ☐ Store embeddings in a vector database
* ☐ Implement semantic search across the codebase
* ☐ Natural language query interface (CLI or web)
* ☐ Return relevant code snippets with file/line references
* ☐ Basic answer generation using retrieved context
* ☐ Deployed and publicly accessible

> A simple RAG pipeline with accurate retrieval beats a complex system with irrelevant results.

---

# Target Codebases

Choose **ONE** primary codebase (or propose an alternative of similar scope):

| Project                | Language   | Description                         |
| ---------------------- | ---------- | ----------------------------------- |
| GnuCOBOL               | COBOL      | Open source COBOL compiler          |
| GNU Fortran (gfortran) | Fortran    | Fortran compiler in GCC             |
| LAPACK                 | Fortran    | Linear algebra library              |
| BLAS                   | Fortran    | Basic linear algebra subprograms    |
| OpenCOBOL Contrib      | COBOL      | Sample COBOL programs and utilities |
| Custom proposal        | Any legacy | Get approval before starting        |

**Minimum size:** 10,000+ lines of code across 50+ files.

---

# Core RAG Infrastructure

## Ingestion Pipeline

| Component            | Requirements                                             |
| -------------------- | -------------------------------------------------------- |
| File Discovery       | Recursively scan codebase, filter by extension           |
| Preprocessing        | Handle encoding, normalize whitespace, extract comments  |
| Chunking             | Syntax-aware splitting (functions, paragraphs, sections) |
| Metadata Extraction  | File path, line numbers, function names, dependencies    |
| Embedding Generation | Generate vectors for each chunk                          |
| Storage              | Insert into vector database with metadata                |

---

## Retrieval Pipeline

| Component         | Requirements                                    |
| ----------------- | ----------------------------------------------- |
| Query Processing  | Parse natural language, extract intent/entities |
| Embedding         | Convert query to vector using same model        |
| Similarity Search | Find top-k similar chunks                       |
| Re-ranking        | Optional relevance reordering                   |
| Context Assembly  | Combine retrieved chunks with context           |
| Answer Generation | LLM response using retrieved context            |

---

# Chunking Strategies

| Strategy                | Use Case                          |
| ----------------------- | --------------------------------- |
| Function-level          | Each function/subroutine as chunk |
| Paragraph-level (COBOL) | COBOL PARAGRAPH boundary          |
| Fixed-size + overlap    | Fallback                          |
| Semantic splitting      | LLM identifies logical boundaries |
| Hierarchical            | File → section → function         |

---

# Testing Scenarios

1. Where is the main entry point?
2. What functions modify the CUSTOMER-RECORD?
3. Explain CALCULATE-INTEREST paragraph
4. Find file I/O operations
5. What are dependencies of MODULE-X?
6. Show error handling patterns

---

# Performance Targets

| Metric               | Target                 |
| -------------------- | ---------------------- |
| Query latency        | <3 seconds             |
| Retrieval precision  | >70% relevant in top-5 |
| Codebase coverage    | 100% indexed           |
| Ingestion throughput | 10,000+ LOC <5 min     |
| Answer accuracy      | Correct file/line refs |

---

# Required Features

## Query Interface

* Natural language input
* Syntax-highlighted snippets
* File paths + line numbers
* Relevance scores
* Generated explanation
* Drill-down to full file

## Code Understanding Features (Choose 4+)

* Code Explanation
* Dependency Mapping
* Pattern Detection
* Impact Analysis
* Documentation Generation
* Translation Hints
* Bug Pattern Search
* Business Logic Extraction

---

# Vector Database Selection

Choose ONE:

| Database | Hosting     | Notes            |
| -------- | ----------- | ---------------- |
| Pinecone | Managed     | Production scale |
| Weaviate | Self/cloud  | Hybrid search    |
| Qdrant   | Self/cloud  | Fast, filtering  |
| ChromaDB | Embedded    | Prototyping      |
| pgvector | Postgres    | Familiar SQL     |
| Milvus   | Self/Zilliz | GPU support      |

---

# Embedding Models

| Model                         | Dimensions | Notes                |
| ----------------------------- | ---------- | -------------------- |
| OpenAI text-embedding-3-small | 1536       | Cost/quality balance |
| OpenAI text-embedding-3-large | 3072       | Higher quality       |
| Voyage Code 2                 | 1536       | Code optimized       |
| Cohere embed-english-v3       | 1024       | English text         |
| sentence-transformers         | varies     | Local                |

---

# AI Cost Analysis (Required)

Track:

* Embedding API costs
* LLM costs
* Vector DB costs
* Total dev spend

Project monthly cost for:

| Users   | Cost |
| ------- | ---- |
| 100     | $___ |
| 1,000   | $___ |
| 10,000  | $___ |
| 100,000 | $___ |

Include assumptions.

---

# RAG Architecture Documentation (Required)

Submit 1–2 page doc covering:

* Vector DB Selection
* Embedding Strategy
* Chunking Approach
* Retrieval Pipeline
* Failure Modes
* Performance Results

---

# Technical Stack (Recommended)

| Layer      | Options                      |
| ---------- | ---------------------------- |
| Vector DB  | Pinecone / Weaviate / Qdrant |
| Embeddings | OpenAI / Voyage              |
| LLM        | GPT-4 / Claude / Open-source |
| Framework  | LangChain / LlamaIndex       |
| Backend    | Node / Python                |
| Frontend   | React / CLI                  |
| Deployment | Vercel / Railway             |

---

# Build Strategy (Priority Order)

1. Codebase selection
2. Basic ingestion
3. Vector storage
4. Query interface
5. Answer generation
6. Chunking refinement
7. Advanced features
8. Evaluation

---

# Submission Requirements

**Deadline:** Sunday 10:59 PM CT

* GitHub repo
* Demo video (3–5 min)
* Pre-Search doc
* RAG Architecture doc
* AI Cost analysis
* Deployed app
* Social post

---

# Interview Preparation

### Technical Topics

* Vector DB choice
* Chunking tradeoffs
* Embedding rationale
* Retrieval failures
* Performance decisions

### Mindset

* Handling ambiguity
* Pivoting from failure
* Growth reflections
* Managing pressure

---

# Appendix: Pre-Search Checklist

## Phase 1: Define Constraints

1. Scale & load
2. Budget
3. Time to ship
4. Data sensitivity
5. Team skills

## Phase 2: Architecture Discovery

6. Vector DB
7. Embeddings
8. Chunking
9. Retrieval
10. Answer generation
11. Framework

## Phase 3: Post-Stack Refinement

12. Failure modes
13. Evaluation
14. Optimization
15. Observability
16. Deployment

---
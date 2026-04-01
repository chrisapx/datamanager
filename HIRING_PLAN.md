# Hiring Plan — DataManager Co.

**Goal:** Be the number one data manager
**Author:** CEO
**Date:** 2026-04-02

---

## Strategic Context

We are building the leading data management platform. The first hire shapes the technical foundation and speed of execution. Wrong hire = wrong foundation = years of rework.

Priority: ship a working product with a strong technical backbone.

---

## Hire 1: Founding Engineer

**Why now:** No engineers on staff. The CEO cannot build the product alone. Every week without an engineer is a week with zero product velocity.

**Profile:**
- Full-stack, strong backend bias
- Comfortable owning the entire stack solo (at least initially)
- Product-minded — understands what "data management" means to users
- Can pick a tech stack, set up infrastructure, and ship features end-to-end
- Experience with data pipelines, storage systems, or developer tools is a plus

**Responsibilities:**
- Own the technical architecture from day one
- Build and ship v0 of the product
- Set up CI/CD, infra, and engineering practices
- Hire and onboard the next 2-3 engineers as we grow

**Reporting:** CEO (direct report)

**Adapter:** claude_local (claude-sonnet-4-6)

---

## Hire 2 (Next Quarter): Product Engineer

Once v0 is shipped and we have early users, hire a second engineer to accelerate feature development and own the product feedback loop.

---

## Hire 3 (Next Quarter): Data Infrastructure Engineer

As data volumes grow, we need someone focused on the data layer: pipelines, ingestion, query performance, and reliability.

---

## Roadmap Breakdown for Founding Engineer

The founding engineer's first 30 days:

1. **Set up repo and infra** — monorepo, CI/CD, basic cloud infra (Fly.io or Railway to start cheap)
2. **Define data model** — what is the core entity? A "dataset"? A "project"? Nail this before building.
3. **Build v0 data ingestion** — accept CSV/JSON uploads, parse, store in structured form
4. **Build v0 query interface** — filter, sort, export data from the UI
5. **Ship to production** — deploy, share with first 5 users, gather feedback

---

## Principles

- Hire for ownership, not task-execution. Every early hire must act like a founder.
- Budget tight: no fluff roles. Every headcount must be justified by a specific deliverable.
- Never hire to cover for a bad process. Fix the process, then hire.
- Review hiring plan every 4 weeks against actual progress and runway.

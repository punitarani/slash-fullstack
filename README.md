# Slash fullstack take home

We're looking for strong fullstack engineers who can work across both frontend and backend. We want engineers who can figure things out on their own quickly and ship projects end-to-end. You should have great product intuition and build things that make sense. If you're looking for a more backend/infra or frontend focused role, check out our other challenges:

- [Slash backend take home](https://github.com/kevinbai0/slash-backend-take-home)
- [Slash frontend take home](https://github.com/kevinbai0/slash-frontend-take-home)

This is *the* primary challenge we evaluate candidates with. We want you to show us what you can do so give us your best work!

### Overview

At Slash, customers keep most of their operating cash with us. This means they send and receive money to and from Slash. Customers mainly send and receive money via book transfers, wire transfers, ACH, and RTP (real-time payments). For this challenge, you'll be implementing transfer automations for book transfers only so that a user can configure rules to automatically send and move money between their accounts and to other users.

### Requirements

You'll be implementing the concept of "automation rules". It must support the following:
1. Schedule a book transfer to happen at a future time.
2. Ability to schedule a book transfer on a recurring basis.
3. Ability to transfer money upon receiving a book transfer.
4. You should also build a frontend for managing these automation rules.
5. You should display what triggered a book transfer so that it's clear why a transfer happened.

For this challenge, you only need to support book transfers (transfers between accounts the user owns and transfers to accounts owned by other users).

The scope is intentionally vague because we want to see how you scope and think through product. We're looking for people with good product intuition and can make good design decisions across both product and engineering.

In this demo application, we've setup the following:
1. Users with accounts that you can perform book transfers to and from.
2. A simple UI for initiating book transfers to accounts you own and to accounts owned by other users.
3. An "admin" page where you can see all users, create new ones, and "impersonate" another user - the admin page lives in the `/admin` route.

We've also setup the following primitives for you to work with, which should be enough to complete the challenge:
1. Postgres database for creating and tracking additional persisting data.
2. A message queue (pg-boss) for background jobs and cron jobs

Important things to consider:
1. Your design should be robust. Consider what happens when things go wrong and failure cases. If a rule has been set, it should *always* execute correctly.
2. When a transfer happens, it should be clear why it happens. Your database design should be able to trace everything that happened.

If you have extra time, feel free to add any additional features to automation rules and tell us why you added them (or tell us what you would add given more time).

### Instructions

1. Clone the repo (and push to a private repo) and run `npm install` to install the dependencies.
2. Run `docker-compose up` to start the database.
3. Run `npm run migrate` to run initial migrations. When you make database changes, you'll want to run `npx drizzle-kit migrate`.
4. Run `npm run dev` to start the development server.
5. Run `npm run worker` to start the background worker. This module isn't hot module reload enabled, so you'll need to restart it after making changes.

Run `npm run test` to run the tests.

### Docs

1. To create new jobs, create a `<name>.job.ts` file in `src/jobs` and make sure you export it in `src/jobs/jobs.ts` so it gets registered by the worker. You can directly call `<job>.trigger` or `<job>.triggerAndWait` to schedule and wait for jobs anywhere in server-side code.
2. To create new pages and routes, refer to App Router docs for next.js - please familiarize yourself with it before starting the challenge if you aren't already.
3. New database schemas should be exported in the `src/db/schema.ts` file to be picked up by the migration runner. We use drizzle for the ORM, but feel free to run raw queries if it's simpler for you.

### Notes
Please provide reasoning for your design decisions (if you want, write a mini design doc and put it here). Otherwise, write out your thought process for your final design that you've implemented. Let us know if there are things you would add given more time, or if there are things you had to skip due to time constraints.

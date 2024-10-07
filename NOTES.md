# Notes

## How customers can transfer money


1. **Book Transfers**: Move money between accounts within the same bank instantly, without fees.
2. **Wire Transfers**: Send money electronically between different banks. They are fast but may have fees and require detailed recipient information.
3. **ACH (Automated Clearing House)**: Used for direct deposits and bill payments. Transfers can take 1-2 business days to process.
4. **RTP (Real-Time Payments)**: Instant transfers available 24/7, allowing immediate access to funds.

## What this project builds

**Automation Rules for Book Transfers**

1. **Schedule a Book Transfer**: Send money from one account to another at a specific future date.
2. **Recurring Book Transfer**: Set up a schedule to transfer money on a recurring basis.
3. **Transfer on Receipt**: Automatically send money when you receive a book transfer.

### User Interface

Basic CRUD for automation rules.

1. **Create**: Create a new automation rule.
2. **View**: View all automation rules.
3. **Edit**: Edit an existing automation rule.
4. **Delete**: Delete an existing automation rule.

The UI will also **Display Triggers** on why a transfer happened.


### Events that trigger transfers

1. **Time-based**: Transfer on a specific day of the week, at a specific time.
2. **Event-based**: Transfer when a specific event happens.

## System Architecture

### Starting Point

- **Postgres** database is the primary database
- **pg-boss** for queueing jobs in Postgres from Node.js
 
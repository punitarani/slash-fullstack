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

## Demo

![Wireframe](./docs/wireframe.png)

- Updated the `/transfer` endpoint to use a pg-boss job called `transfer-money`.
  - The primary goal was to move the transfer logic out of the API process and into a job.
  - This allows the API to respond faster and it allows the transfer to be completed asynchronously without blocking the API.
  - This is a much better design for a real-world application as it allows the app, API and jobs to be decoupled and scale independently.
  - Most importantly, it can be expanded to support more types of transfers (e.g. ACH, RTP, Wire, etc.) which can take different amounts of time to complete and have different fee structures, etc.
- Created a `/schedule` page to create and view scheduled transfers.
- Created a `/schedule` endpoing that handles the logic for scheduling transfers.
  - The parameters are very similar to the `/transfers` endpoint.
  - The main differences are the additional parameters for the triggers.
- Added a `create-schedule-transfer` job that can create and setup a scheduled transfer.
  - The primary implementatation creates a `transfer-money` job that is scheduled to run at a specific time.
  - The `transfer-money` job is responsible for creating the transfer and updating the status of the scheduled transfer.
  - The `transfer-money` job is also responsible for retrying the transfer if it fails.
  - The `transfer-money` job also handles the logic for recurring transfers.
  - If the transfer is triggered by an event (e.g. a payment is received), the data is stored in the database, and based on the type of trigger, a `transfer-money` job is created when it is triggered to perform the transfer.

![Endpoints](./docs/endpoints.png)

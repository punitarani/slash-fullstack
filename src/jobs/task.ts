import type PgBoss from "pg-boss";
import boss from "./boss";
import { db } from "@/db/db";
import { jobResults } from "@/db/job-results.db";

/**
 * Creates a job. Call job.trigger() to trigger it, or job.triggerAndWait() to trigger and wait for the result.
 * If you create a job, make sure to register it to the jobs.ts file by exporting it.
 */
export function createJob<Params extends object, Returns>(jobParams: {
	name: string;
	handler: (params: Params) => Promise<Returns>;
	options?: PgBoss.JobOptions;
}) {
	return {
		async trigger(options: {
			params: Params;
		}): Promise<string | undefined> {
			await boss.start();
			const id = await boss.send({
				name: jobParams.name,
				data: { params: options.params },
				options: jobParams.options,
			});
			console.log("job scheduled", id);

			return id ?? undefined;
		},

		async triggerAndWait(options: {
			params: Params;
			/**
			 * Time in ms. Defaults to 5,000ms
			 */
			timeoutOnWait?: number;
		}): Promise<Returns> {
			const id = await this.trigger({ params: options.params });
			if (!id) {
				throw new Error("Job not scheduled");
			}

			const startTime = Date.now();
			const timeout = options.timeoutOnWait ?? 5000;
			let result: (typeof jobResults)["$inferSelect"] | undefined;

			do {
				result = await db.query.jobResults.findFirst({
					where: (job, { eq }) => eq(job.id, id),
				});

				if (Date.now() - startTime > timeout) {
					throw new Error(`Job ${id} timed out after ${timeout}ms`);
				}

				await new Promise((resolve) => setTimeout(resolve, 200));
			} while (!result);

			return result.response as Returns;
		},

		async registerToWorker(boss: PgBoss) {
			await boss.createQueue(jobParams.name);
			await boss.work(jobParams.name, async (jobs) => {
				for (const job of jobs) {
					if (
						typeof job.data !== "object" ||
						!job.data ||
						!("params" in job.data)
					) {
						throw new Error("Job data is missing");
					}
					console.log(
						`performing work on ${jobParams.name} - ${job.id}`,
						JSON.stringify(job.data.params),
					);
					const result = await jobParams.handler(job.data.params as Params);

					// Save the job result to the database
					const insert = await db
						.insert(jobResults)
						.values({
							id: job.id,
							response: result,
						})
						.returning();
					console.log(insert);

					return result;
				}
			});
		},
	};
}

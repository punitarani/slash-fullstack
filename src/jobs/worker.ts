import boss from "./boss";
import * as jobs from "./jobs";

boss.on("error", (error) => console.error(error));

export async function startBoss() {
	try {
		await boss.start();
		for (const jobData of Object.values(jobs)) {
			await jobData.registerToWorker(boss);
		}

		console.log("PgBoss started");
	} catch (error) {
		console.error("Error starting PgBoss:", error);
	}
}

startBoss();

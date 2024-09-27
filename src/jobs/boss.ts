import PgBoss from "pg-boss";

const connectionString = "postgres://postgres@localhost:5432/slash";

const boss = new PgBoss(connectionString);

export default boss;

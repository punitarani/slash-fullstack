ALTER TABLE "users" ADD COLUMN "full_name" text GENERATED ALWAYS AS (CASE WHEN first_name IS NULL THEN last_name
				 WHEN last_name IS NULL THEN first_name
				 ELSE first_name || ' ' || last_name END) STORED NOT NULL;
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

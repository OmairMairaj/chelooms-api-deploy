-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Registered', 'Administrator', 'Inventory_Manager');

-- CreateEnum
CREATE TYPE "AuthProviderType" AS ENUM ('Email', 'Mobile', 'Google', 'Microsoft', 'Apple');

-- CreateEnum
CREATE TYPE "AuthAttemptType" AS ENUM ('login', 'register', 'otp_verify', 'email_verify');

-- CreateEnum
CREATE TYPE "AuthStatus" AS ENUM ('success', 'failed', 'blocked');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "mobile_number" VARCHAR(20),
    "password_hash" VARCHAR(255),
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_mobile_verified" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'Registered',
    "profile_picture_url" TEXT,
    "preferred_language" VARCHAR(10) NOT NULL DEFAULT 'English',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "social_identities" (
    "identity_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProviderType" NOT NULL,
    "provider_uid" VARCHAR(255) NOT NULL,
    "linked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_identities_pkey" PRIMARY KEY ("identity_id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "code_id" UUID NOT NULL,
    "identifier" VARCHAR(255) NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("code_id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "device_info" TEXT,
    "ip_address" INET,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_active" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "auth_audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "identifier" VARCHAR(255) NOT NULL,
    "attempt_type" "AuthAttemptType" NOT NULL,
    "status" "AuthStatus" NOT NULL,
    "failure_reason" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_number_key" ON "users"("mobile_number");

-- CreateIndex
CREATE UNIQUE INDEX "social_identities_provider_provider_uid_key" ON "social_identities"("provider", "provider_uid");

-- AddForeignKey
ALTER TABLE "social_identities" ADD CONSTRAINT "social_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

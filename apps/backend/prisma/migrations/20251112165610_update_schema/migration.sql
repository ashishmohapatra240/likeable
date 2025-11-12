/*
  Warnings:

  - You are about to drop the column `name` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the `Chat` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `initialPrompt` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('TOOL_CALL', 'TEXT_MESSAGE', 'ERROR_MESSAGE');

-- CreateEnum
CREATE TYPE "MessageFrom" AS ENUM ('USER', 'AGENT');

-- CreateEnum
CREATE TYPE "ToolCall" AS ENUM ('CREATE_FILE', 'READ_FILE', 'DELETE_FILE', 'EXECUTE_COMMAND', 'RENAME_FILE', 'LIST_DIRECTORIES', 'GET_CONTEXT', 'SAVE_CONTEXT', 'TEST_BUILD', 'WRITE_MULTIPLE_FILES', 'CHECK_MISSING_DEPENDENCIES');

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_projectId_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "name",
ADD COLUMN     "initialPrompt" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- DropTable
DROP TABLE "Chat";

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "from" "MessageFrom" NOT NULL,
    "type" "ConversationType" NOT NULL,
    "contents" TEXT NOT NULL,
    "toolCall" "ToolCall",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

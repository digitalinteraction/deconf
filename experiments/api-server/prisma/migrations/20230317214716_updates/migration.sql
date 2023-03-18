-- CreateTable
CREATE TABLE "SessionInterest" (
    "userId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "role" "ConfRole" NOT NULL,

    CONSTRAINT "SessionInterest_pkey" PRIMARY KEY ("userId","sessionId")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visitorId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SessionInterest" ADD CONSTRAINT "SessionInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionInterest" ADD CONSTRAINT "SessionInterest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

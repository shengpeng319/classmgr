-- CreateTable
CREATE TABLE "RememberedUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "rememberToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RememberedUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RememberedUser_userId_deviceId_key" ON "RememberedUser"("userId", "deviceId");

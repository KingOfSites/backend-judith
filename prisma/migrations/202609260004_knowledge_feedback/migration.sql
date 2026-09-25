CREATE TABLE IF NOT EXISTS `KnowledgeFeedback` (
  `replyId` VARCHAR(191) NOT NULL,
  `interactionId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `helpful` BOOLEAN NULL,
  `reaction` VARCHAR(32) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `KnowledgeFeedback_interactionId_idx`(`interactionId`),
  INDEX `KnowledgeFeedback_helpful_updatedAt_idx`(`helpful`, `updatedAt`),
  PRIMARY KEY (`replyId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

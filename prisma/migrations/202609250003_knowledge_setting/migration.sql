CREATE TABLE IF NOT EXISTS `KnowledgeSetting` (
  `chave` VARCHAR(64) NOT NULL,
  `valor` JSON NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

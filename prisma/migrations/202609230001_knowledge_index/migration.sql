-- AlterTable
ALTER TABLE `FichaConhecimento` MODIFY `conteudo` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- CreateTable
CREATE TABLE `KnowledgeDocument` (
    `sourceId` VARCHAR(191) NOT NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `published` BOOLEAN NOT NULL,

    PRIMARY KEY (`sourceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeChunk` (
    `id` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `ordinal` INTEGER NOT NULL,
    `chapter` LONGTEXT NOT NULL,
    `subchapter` LONGTEXT NULL,
    `line` INTEGER NOT NULL,
    `content` LONGTEXT NOT NULL,
    `embeddingId` CHAR(64) NOT NULL,

    UNIQUE INDEX `KnowledgeChunk_sourceId_ordinal_key`(`sourceId`, `ordinal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeChunkArea` (
    `chunkId` VARCHAR(191) NOT NULL,
    `area` VARCHAR(32) NOT NULL,

    INDEX `KnowledgeChunkArea_area_chunkId_idx`(`area`, `chunkId`),
    PRIMARY KEY (`chunkId`, `area`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeEmbedding` (
    `id` CHAR(64) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `dimensions` INTEGER NOT NULL,
    `vector` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeJob` (
    `id` VARCHAR(191) NOT NULL,
    `requestKey` VARCHAR(191) NOT NULL,
    `activeKey` VARCHAR(32) NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'pending',
    `total` INTEGER NOT NULL DEFAULT 0,
    `processed` INTEGER NOT NULL DEFAULT 0,
    `result` JSON NULL,
    `errors` JSON NULL,
    `leaseUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KnowledgeJob_requestKey_key`(`requestKey`),
    UNIQUE INDEX `KnowledgeJob_activeKey_key`(`activeKey`),
    INDEX `KnowledgeJob_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KnowledgeChunk` ADD CONSTRAINT `KnowledgeChunk_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `KnowledgeDocument`(`sourceId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeChunk` ADD CONSTRAINT `KnowledgeChunk_embeddingId_fkey` FOREIGN KEY (`embeddingId`) REFERENCES `KnowledgeEmbedding`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeChunkArea` ADD CONSTRAINT `KnowledgeChunkArea_chunkId_fkey` FOREIGN KEY (`chunkId`) REFERENCES `KnowledgeChunk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

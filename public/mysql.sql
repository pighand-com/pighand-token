SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for token_platform
-- ----------------------------
DROP TABLE IF EXISTS `token_platform`;
CREATE TABLE `token_platform` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `platform` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '平台',
  `appid` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `secret` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `access_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `expires_time` bigint unsigned DEFAULT NULL COMMENT '过期时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_develop_key_project_id_expire_time` (`project_id`,`expires_time`),
  KEY `idx_develop_key_project_id_platform_appid` (`project_id`,`platform`,`appid`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='平台token';

-- ----------------------------
-- Table structure for token_user
-- ----------------------------
DROP TABLE IF EXISTS `token_user`;
CREATE TABLE `token_user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `user_id` bigint NOT NULL,
  `platform` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '平台',
  `access_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `expires_time` bigint unsigned DEFAULT NULL COMMENT '过期时间',
  `refresh_token` varchar(255) DEFAULT NULL COMMENT '刷新token',
  `refresh_expires_time` bigint DEFAULT NULL COMMENT '刷新token过期token',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_develop_key_project_id_expire_time` (`project_id`,`expires_time`),
  KEY `idx_develop_key_project_id_platform_appid` (`project_id`,`platform`,`user_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='平台token';

SET FOREIGN_KEY_CHECKS = 1;

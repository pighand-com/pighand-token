SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for token
-- ----------------------------
DROP TABLE IF EXISTS `token`;
CREATE TABLE `token` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `platform` varchar(8) NOT NULL COMMENT '平台',
  `type` tinyint(1) DEFAULT NULL COMMENT '类型 1平台token 2用户token',
  `appid` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '平台存appid，用户存userid',
  `secret` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `expire_time` bigint unsigned DEFAULT NULL COMMENT '过期时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_develop_key_project_id_expire_time` (`project_id`,`expire_time`),
  KEY `idx_develop_key_project_id_platform_appid` (`project_id`,`platform`,`appid`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;

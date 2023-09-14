import { scheduleJob } from 'node-schedule';

import config from '../../config/config';
import TokenUserMongoModel from '../model/TokenUserMongoModel';
import TokenUserMysqlModel from '../model/TokenUserMysqlModel';
import MemoryCache from '../../config/db/MemoryCache';
import mysqlClient from '../../config/db/Mysql';
import mongoClient from '../../config/db/Mongo';
import { saveTarget } from './base/BaseAbstract';
import Service from './Service';
import { isTokenExpired, getNow } from '../common/ExpiresUtil';

const { refresh_token_schedule, refresh_token_premature_failure } = config;

/**
 * 定时任务，刷新过期refresh token
 */
class Schedule {
    async run() {
        // 是否启动定时任务。未设置轮询时间、未连接数据库，不启动
        const isStart =
            refresh_token_schedule &&
            Number.isInteger(refresh_token_schedule) &&
            refresh_token_schedule &&
            (saveTarget().isCache ||
                saveTarget().isRedis ||
                saveTarget().isMysql ||
                saveTarget().isMongo);

        if (isStart) {
            await this.jobRefreshExpireToken();

            const job = scheduleJob(refresh_token_schedule, async () => {
                try {
                    await this.jobRefreshExpireToken();
                } catch (e) {
                    job.cancel();

                    console.error(e);
                }
            });
        }
    }

    /**
     * 聚合过期token
     * @param target 聚合结果
     * @param source 数据源
     */
    private aggregation(target: Array<any>, source: Array<any>) {
        source.forEach((token) => {
            const { projectId, platform, appid, secret } = token;

            if (appid && secret) {
                target.push({
                    projectId,
                    platform,
                    appid,
                    secret,
                });
            }
        });
    }

    /**
     * 刷新过期token
     */
    private async jobRefreshExpireToken() {
        const expireTokens: Array<any> = [];

        // 缓存中过期的token
        const cache = Array.from(MemoryCache.cache.values()).filter((item) => {
            return isTokenExpired(
                item.refreshExpiresTime - refresh_token_premature_failure,
            );
        });
        this.aggregation(expireTokens, cache);

        const dbQueryFunctions = [];
        const refreshExpiresTime = getNow() - refresh_token_premature_failure;

        // mysql过期token
        if (mysqlClient) {
            dbQueryFunctions.push(
                TokenUserMysqlModel.findAll({
                    where: {
                        refreshExpiresTime: {
                            $lte: refreshExpiresTime,
                        },
                    },
                }),
            );
        }

        // mongo过期token
        if (mongoClient) {
            dbQueryFunctions.push(
                TokenUserMongoModel.find({
                    where: {
                        refreshExpiresTime: {
                            $lte: refreshExpiresTime,
                        },
                    },
                }),
            );
        }

        const [mysqlTokens, mongoTokens] = await Promise.all(dbQueryFunctions);

        if (mysqlTokens) {
            this.aggregation(expireTokens, mysqlTokens);
        }
        if (mongoTokens) {
            this.aggregation(expireTokens, mongoTokens);
        }

        // 成新token
        expireTokens.forEach(async (expireToken) => {
            const { projectId, platform, userId, refreshToken } = expireToken;
            const platformService = Service.getPlatformService(platform);

            platformService.getNewAccessToken(
                projectId,
                { userId },
                { refreshToken, isUpdate: true },
            );
        });
    }
}

export default new Schedule();

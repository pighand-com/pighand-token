import { RecurrenceRule, scheduleJob } from 'node-schedule';

import config from '../../config/config';
import TokenMysqlModel from '../model/TokenMysqlModel';
import TokenMongoModel from '../model/TokenMongoModel';
import MemoryCache from '../../config/db/MemoryCache';
import { client as mysqlClient } from '../../config/db/Mysql';
import { client as mongoClient } from '../../config/db/Mongo';
import { saveTarget } from './base/PlatformAbstract';
import Service from './Service';

const { corn_interval } = config;

/**
 * 定时任务，刷新过期token
 */
class Schedule {
    async run() {
        // 是否启动定时任务。未设置轮询时间、未连接数据库，不启动
        const isStart =
            corn_interval &&
            Number.isInteger(corn_interval) &&
            corn_interval > 0 &&
            (saveTarget().isCache ||
                saveTarget().isRedis ||
                saveTarget().isMysql ||
                saveTarget().isMongo);

        if (isStart) {
            console.log('run');
            const rule = new RecurrenceRule();
            rule.second = corn_interval;

            await this.jobRefreshExpireToken();

            const job = scheduleJob(rule, async () => {
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

        // 缓存过期token
        const cache = MemoryCache.cache.values();
        this.aggregation(expireTokens, Array.from(cache));

        const dbQueryFunctions = [];

        // mysql过期token
        if (mysqlClient) {
            dbQueryFunctions.push(
                TokenMysqlModel.findAll({
                    where: {
                        $or: [
                            {
                                expireTime: {
                                    $lte: Date.now(),
                                },
                            },
                            {
                                expireTime: null,
                            },
                        ],
                    },
                }),
            );
        }

        // mongo过期token
        if (mongoClient) {
            dbQueryFunctions.push(
                TokenMongoModel.find({
                    where: {
                        $or: [
                            {
                                expireTime: {
                                    $lte: Date.now(),
                                },
                            },
                            {
                                expireTime: null,
                            },
                        ],
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

        // 异步生成新token
        expireTokens.forEach((expireToken) => {
            const { projectId, platform, appid, secret } = expireToken;
            const platformService = Service.getPlatformService(platform);

            platformService.getNewAccessToken(projectId, appid, secret);
        });
    }
}

export default new Schedule();

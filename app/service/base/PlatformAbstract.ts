import { AxiosResponse } from 'axios';

import cacheKey from './cacheKey';
import config from '../../../config/config';
import PlatformEnum from './PlatformEnum';
import MemoryCache from '../../../config/db/MemoryCache';
import Redis from '../../../config/db/Redis';
import Mysql from '../../../config/db/Mysql';
import Mongo from '../../../config/db/Mongo';
import TokenMysqlModel from '../../model/TokenMysqlModel';
import TokenMongoModel from '../../model/TokenMongoModel';

import RedisLock from '../../util/RedisLock';

/**
 * 平台返回值
 */
interface PlatformTokenResult {
    // access_token
    accessToken: string;

    // 失效时间，单位秒
    expiresIn: number;
}

/**
 * 保存目标
 */
interface saveTargetSchema {
    isCache: boolean;
    isRedis: boolean;
    isMysql: boolean;
    isMongo: boolean;
}
let saveTargetInfo: saveTargetSchema;
export const saveTarget = () => {
    if (!saveTargetInfo) {
        const { save_model = ['auto'] } = config;

        const isCache =
            save_model.includes('auto') ||
            save_model.includes('all') ||
            save_model.includes('cache');

        const isRedis =
            !!Redis.client &&
            (save_model.includes('auto') ||
                save_model.includes('all') ||
                save_model.includes('redis'));

        const isMysql =
            !!Mysql.client &&
            (save_model.includes('all') ||
                save_model.includes('mysql') ||
                (save_model.includes('auto') && !isRedis));

        const isMongo =
            !!Mongo.client &&
            (save_model.includes('all') ||
                save_model.includes('mongo') ||
                (save_model.includes('auto') && !isRedis));

        saveTargetInfo = {
            isCache,
            isRedis,
            isMysql,
            isMongo,
        };
    }
    return saveTargetInfo;
};

/**
 * 各平台类抽象类
 *
 * @params cacheExpiresIn 集群模式，本地缓存有效期。
 * 集群模式下，单进程刷新有效期，其他进程本地缓存无法感知新token；
 * 故不能从本地缓存获取到最新的token，但老token在一定时间内依然有效；
 * 具体时间参考各平台，一般设置 <= 老token有效时间
 */
abstract class PlatformAbstract {
    // 平台
    platform: PlatformEnum;
    // 集群模式，本地缓存有效期
    clusterCacheExpiresIn: number;

    constructor(platform: PlatformEnum, clusterCacheExpiresIn: number) {
        this.platform = platform;
        this.clusterCacheExpiresIn = clusterCacheExpiresIn;
    }

    /**
     * 获取token。
     * 查询是否存在有效token，如果不存在，生成新token
     *
     * @param projectId
     * @param appid
     *
     * @returns access_token
     */
    async get(
        projectId: string | number,
        appid: string,
        secret?: string,
    ): Promise<string> {
        // 查询有效token
        let { accessToken, secret: newSecret } = await this.getValidToken(
            projectId,
            appid,
            secret,
        );

        // 获取新token
        if (!accessToken) {
            accessToken = await this.getNewAccessToken(
                projectId,
                appid,
                newSecret,
            );
        }

        return accessToken;
    }

    /**
     * 查询新的access_token，并将新token存入库
     * @param projectId
     * @param appid
     * @param secret
     * @param nowToken  当前token，用于跟redis中现有token判断；
     *                  相等则redis中是失效token，强制刷新；
     *                  否则其他线程已更新，返回redis中的最新token
     * @returns access_token
     */
    async getNewAccessToken(
        projectId: string | number,
        appid: string,
        secret?: string,
        nowToken?: string,
    ): Promise<string> {
        let newAccessToken;
        const tokenCacheKey = cacheKey(projectId, this.platform, appid);

        // 集群模式获取锁，防止多进程更新
        let redisLock;
        const redisLockKey = 'lock_' + tokenCacheKey;
        const redisLockValue = `${Math.random()}`;
        if (
            config.is_cluster == true ||
            (config.is_cluster == 'auto' && Redis.client)
        ) {
            redisLock = new RedisLock(60, 70);
            const lock = await redisLock.lock(redisLockKey, redisLockValue);

            if (!lock) {
                console.error('获取锁失败');
                return;
            }

            // 获取到锁，从redis中查询最新token，防止重复更新
            const redisToken = await Redis.client.get(tokenCacheKey);

            // 根据当前token，判断是否强制刷新
            if (redisToken && nowToken && redisToken !== nowToken) {
                newAccessToken = redisToken;
            }
        }

        if (!newAccessToken) {
            // 远程查询新token

            // 查询平台secret
            if (!secret) {
                secret = await this.getSecret(projectId, appid, secret);

                if (!secret) {
                    throw new Error('未发现secret');
                }
            }

            // 调用子类实现方法，查询新token
            const platformResult = await this.getAccessToken(appid, secret);
            const newAccessTokenResult: PlatformTokenResult =
                this.disposeResult(platformResult);

            const { accessToken, expiresIn } = newAccessTokenResult;
            newAccessToken = accessToken;

            // 保存新token
            await this.saveToDB(
                projectId,
                appid,
                newAccessToken,
                expiresIn,
                false,
            );
        } else {
            // 从redis获取到新token，只保存本地缓存
            await this.saveToDB(
                projectId,
                appid,
                newAccessToken,
                this.clusterCacheExpiresIn,
                true,
            );
        }

        // 释放锁
        if (redisLock) {
            await redisLock.unLock(redisLockKey, redisLockValue);
        }

        return newAccessToken;
    }

    /**
     * 查询secret
     * @param projectId
     * @param appid
     * @param secret
     * @param mysqlTokenInfo
     * @param mongoTokenInfo
     * @returns
     */
    async getSecret(
        projectId: string | number,
        appid: string,
        secret?: string,
        mysqlTokenInfo?: any,
        mongoTokenInfo?: any,
    ) {
        // 1 - 从参数取
        if (secret) {
            return secret;
        }

        // 2.1 - 从mysql中取
        if (!secret) {
            if (!mysqlTokenInfo && Mysql.client) {
                mysqlTokenInfo = await TokenMysqlModel.findOne({
                    where: {
                        projectId,
                        platform: this.platform,
                        appid: appid,
                    },
                });
            }

            secret = mysqlTokenInfo ? mysqlTokenInfo.get('secret') : secret;
        }

        // 2.2 - 从mongo中取
        if (!secret) {
            if (!mongoTokenInfo && Mongo.client) {
                mongoTokenInfo = await TokenMongoModel.findOne({
                    projectId,
                    platform: this.platform,
                    appid,
                });
            }
            secret = mongoTokenInfo ? mongoTokenInfo.secret : secret;
        }

        // 3 - 在没配置mysql、mongo时，从缓存中取
        if (!secret && saveTarget().isCache) {
            const tokenCacheKey = cacheKey(projectId, this.platform, appid);
            const cacheInfo = MemoryCache.getCacheInfo(tokenCacheKey);
            secret = (cacheInfo || {}).secret;
        }

        return secret;
    }

    /**
     * 查询库中有效token
     * 查询顺序：1-本地缓存 2-redis 3-mysql、mongo
     * token不存在，获取secret，用于查询新token
     *
     * @param projectId
     * @param appid
     * @param secret
     *
     * @returns {access_token, secret}
     */
    private async getValidToken(
        projectId: string | number,
        appid: string,
        secret?: string,
    ) {
        let accessToken: string;

        const tokenCacheKey = cacheKey(projectId, this.platform, appid);

        // 1 - 如果启用缓存，先从本地缓存中取
        if (saveTarget().isCache) {
            accessToken = await MemoryCache.get(tokenCacheKey);
        }

        // 2 - 从redis中取
        if (!accessToken && Redis.client) {
            accessToken = await Redis.client.get(tokenCacheKey);
        }

        // 3.1 - 从mysql取
        let mysqlTokenInfo;
        if (!accessToken && Mysql.client) {
            mysqlTokenInfo = await TokenMysqlModel.findOne({
                where: {
                    projectId,
                    platform: this.platform,
                    appid: appid,
                },
            });

            // 取未过期的token
            if (
                mysqlTokenInfo &&
                mysqlTokenInfo.get('expireTime') < Date.now()
            ) {
                accessToken = mysqlTokenInfo.get('token');
            }
        }

        // 3.2 - 从mongo取
        let mongoTokenInfo;
        if (!accessToken && Mongo.client) {
            const mongoTokenInfo = await TokenMongoModel.findOne({
                projectId,
                platform: this.platform,
                appid,
            });

            // 取未过期的token
            if (mongoTokenInfo && mongoTokenInfo.expireTime < Date.now()) {
                accessToken = mongoTokenInfo.token;
            }
        }

        // 不存在有效token，获取secret，用于查询新token
        // 在此查询secret，减少重查数据库次数
        if (!accessToken) {
            secret = await this.getSecret(
                projectId,
                appid,
                secret,
                mysqlTokenInfo,
                mongoTokenInfo,
            );
        }

        return { accessToken, secret };
    }

    /**
     * 保存token
     * @param projectId
     * @param appid
     * @param accessToken
     * @param expiresIn
     * @param onlyCache 只保存到本地缓存。集群模式下，其他进程获取最新token，保存到库；当前进程直接只需更新本地缓存
     */
    private async saveToDB(
        projectId: string | number,
        appid: string,
        accessToken: string,
        expiresIn: number,
        onlyCache: boolean,
    ) {
        // 失效时间，单位秒
        const expiresTTL = expiresIn - config.premature_failure;
        const expiresTime = Date.now() + expiresTTL;
        const clusterCacheExpiresTime = Date.now() + this.clusterCacheExpiresIn;

        const tokenCacheKey = cacheKey(projectId, this.platform, appid);

        // token保存到本地缓存
        if (saveTarget().isCache) {
            MemoryCache.set(
                tokenCacheKey,
                accessToken,
                config.is_cluster ? clusterCacheExpiresTime : expiresTime,
            );
        }

        // token保存redis
        if (!onlyCache && saveTarget().isRedis) {
            const syncRedis = await Redis.client.set(
                tokenCacheKey,
                accessToken,
                {
                    EX: expiresTTL,
                },
            );

            // 集群模式，通知保存到redis。供别的进程获取最新token
            if (config.is_cluster) {
                await syncRedis;
            }
        }

        // token保存mysql
        if (!onlyCache && saveTarget().isMysql) {
            TokenMysqlModel.update(
                {
                    accessToken,
                    expireTime: expiresTime,
                },
                {
                    where: {
                        projectId,
                        platform: this.platform,
                        appid: appid,
                    },
                },
            );
        }

        // token保存mongo
        if (!onlyCache && saveTarget().isMongo) {
            TokenMongoModel.updateOne(
                {
                    projectId,
                    platform: this.platform,
                    appid: appid,
                },
                {
                    accessToken,
                    expireTime: expiresTime,
                },
            );
        }
    }

    /**
     * 根据appid查询key
     * 查询顺序：1-参数 2-本地缓存 3-mysql、mongo
     *
    /**
     * 子类方法：通过接口获取access_token方法
     *
     * @param appid
     * @param secret
     */
    abstract getAccessToken(
        appid: string,
        secret: string,
    ): Promise<AxiosResponse>;

    /**
     * 子类方法：处理平台的返回值
     * @param result
     * @returns 返回的token
     */
    abstract disposeResult(result: AxiosResponse): PlatformTokenResult;
}

export default PlatformAbstract;

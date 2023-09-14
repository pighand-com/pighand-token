import { AxiosResponse } from 'axios';

import cacheKey from '../../common/cacheKey';
import config from '../../../config/config';
import MemoryCache from '../../../config/db/MemoryCache';
import Redis from '../../../config/db/Redis';
import Mysql from '../../../config/db/Mysql';
import Mongo from '../../../config/db/Mongo';
import { expiresTTL, expiresIn2Time, getNow } from '../../common/ExpiresUtil';

import RedisLock from '../../util/RedisLock';

export interface TokenResult {
    // access_token
    accessToken: string;

    // 扩展字段
    [key: string]: any;
}

export interface TokenRefreshResult {
    // 刷新token
    refreshToken?: string;
    // 刷新token - 失效秒数
    refreshExpiresIn?: number;
    // 刷新token - 失效时间
    refreshExpiresTime?: number;
}

/**
 * 平台返回值
 */
export interface NewTokenResultByIn extends TokenResult, TokenRefreshResult {
    // 失效秒数
    expiresIn: number;
}
export interface NewTokenResultByTime extends TokenResult, TokenRefreshResult {
    // 失效时间
    expiresTime: number;
}

/**
 * 保存目标
 */
interface SaveTargetSchema {
    isCache: boolean;
    isRedis: boolean;
    isMysql: boolean;
    isMongo: boolean;
}
let saveTargetInfo: SaveTargetSchema;
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
 * 获取token，扩展参数
 */
export interface BaseParams {
    // platform access_token
    appid?: string;
    secret?: string;

    // user access_token
    userId?: number;

    // 使用code获取新token
    code?: string;

    // 是否返回扩展字段
    showExtend?: boolean;

    /**
     * 当前token，用于跟redis中现有token判断；
     * 相等则redis中是失效token，强制刷新；
     * 否则其他线程已更新，返回redis中的最新token
     */
    nowToken?: string;

    // 强制刷新，无论是否有效，都刷新token
    forceRefresh?: boolean;
}

/**
 * 查询有效token返回值
 */
export interface BaseGetTokenResult {
    accessToken: string;
    isUpdate: boolean;
}

/**
 * 各平台类抽象类
 *
 * @params cacheExpiresIn 集群模式，本地缓存有效期。
 * 集群模式下，单进程刷新有效期，其他进程本地缓存无法感知新token；
 * 故不能从本地缓存获取到最新的token，但老token在一定时间内依然有效；
 * 具体时间参考各平台，一般设置 <= 老token有效时间
 */
abstract class PlatformAbstract<T extends BaseGetTokenResult> {
    // 平台
    platform: string;

    // 集群模式，本地缓存有效期
    clusterCacheExpiresIn: number;

    // token类型
    tokenType: 'user' | 'platform';

    constructor(
        platform: string,
        clusterCacheExpiresIn: number,
        tokenType: 'user' | 'platform',
    ) {
        this.platform = platform;
        this.clusterCacheExpiresIn = clusterCacheExpiresIn;
        this.tokenType = tokenType;
    }

    /**
     * 获取token。
     * 查询是否存在有效token，如果不存在，生成新token
     *
     * @param projectId
     * @param params
     *
     * @returns access_token
     */
    async get(
        projectId: string | number,
        params: BaseParams = {},
    ): Promise<TokenResult> {
        // 参数校验
        this.check(params);

        let result: TokenResult = { accessToken: '' };

        // 查询有效token
        const validToken = await this.getValidToken(projectId, params);

        if (validToken.accessToken && !params.forceRefresh) {
            result.accessToken = validToken.accessToken;
        } else {
            // 获取新token
            result = await this.getNewAccessToken(
                projectId,
                params,
                validToken as T,
            );
        }

        const { showExtend } = params;
        if (!showExtend) {
            return {
                accessToken: result.accessToken,
            };
        }

        delete result.expiresIn;
        delete result.expiresTime;
        delete result.refreshToken;
        delete result.refreshExpiresIn;
        delete result.refreshExpiresTime;
        return result;
    }

    /**
     * @param projectId
     * @param params
     * @param validToken
     *
     * @returns access_token
     */
    async getNewAccessToken(
        projectId: string | number,
        params: BaseParams,
        validToken: T,
    ): Promise<NewTokenResultByIn | NewTokenResultByTime> {
        let result: NewTokenResultByIn | NewTokenResultByTime = {
            accessToken: '',
            expiresIn: 0,
            expiresTime: 0,
        };

        const tokenCacheKey = cacheKey(
            projectId,
            this.platform,
            params.appid || params.userId,
        );

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
            if (
                redisToken &&
                params.nowToken &&
                redisToken !== params.nowToken
            ) {
                result.accessToken = redisToken;
            }
        }

        const isUpdate = validToken.isUpdate;
        if (!result.accessToken) {
            // 远程查询新token

            // 调用子类实现方法，查询新token
            const platformResult = await this.getAccessTokenInSub(
                projectId,
                params,
                validToken,
            );
            const newAccessTokenResult = this.disposeResult(platformResult);

            result = newAccessTokenResult;

            // 保存新token
            await this.saveToDB(
                projectId,
                params,
                newAccessTokenResult,
                false,
                isUpdate,
            );
        } else {
            // 从redis获取到新token，只保存本地缓存
            await this.saveToDB(
                projectId,
                params,
                {
                    accessToken: result.accessToken,
                    expiresIn: this.clusterCacheExpiresIn,
                },
                true,
                isUpdate,
            );
        }

        // 释放锁
        if (redisLock) {
            await redisLock.unLock(redisLockKey, redisLockValue);
        }

        return result;
    }

    /**
     * 查询库中有效token
     * 查询顺序：1-本地缓存 2-redis 3-mysql、mongo
     * token不存在，获取secret，用于查询新token
     *
     * @param projectId
     * @param params
     *
     * @returns T
     */
    private async getValidToken(
        projectId: string | number,
        params: BaseParams,
    ) {
        let result = {
            accessToken: '',
        };

        const { appid, userId } = params;

        const tokenCacheKey = cacheKey(
            projectId,
            this.platform,
            appid || userId,
        );

        // 1 - 如果启用缓存，先从本地缓存中取
        if (saveTarget().isCache) {
            result.accessToken = await MemoryCache.get(tokenCacheKey);
        }

        // 2 - 从redis中取
        if (!result.accessToken && Redis.client) {
            result.accessToken = await Redis.client.get(tokenCacheKey);
        }

        // 3 - 从数据库中取
        if (!result.accessToken) {
            result = await this.getTokenFromDB(projectId, params);
        }

        return result;
    }

    /**
     * 保存token
     * @param projectId
     * @param params
     * @param newTokenResult
     * @param onlyCache 只保存到本地缓存。集群模式下，其他进程获取最新token，保存到库；当前进程直接只需更新本地缓存
     * @param isUpdate
     */
    private async saveToDB(
        projectId: string | number,
        params: BaseParams,
        newTokenResult: NewTokenResultByIn | NewTokenResultByTime,
        onlyCache: boolean,
        isUpdate: boolean,
    ) {
        const now = getNow();

        // 失效时间，单位秒
        const tokenExpiresTTL = expiresTTL(newTokenResult.expiresIn);
        newTokenResult.expiresTime =
            newTokenResult.expiresTime ||
            expiresIn2Time(newTokenResult.expiresIn);

        newTokenResult.refreshExpiresTime = expiresIn2Time(
            newTokenResult.refreshExpiresIn,
        );

        const clusterCacheExpiresTime = now + this.clusterCacheExpiresIn;

        const tokenCacheKey = cacheKey(
            projectId,
            this.platform,
            params.appid || params.userId,
        );

        // token保存到本地缓存
        if (saveTarget().isCache) {
            MemoryCache.set(
                tokenCacheKey,
                newTokenResult.accessToken,
                config.is_cluster
                    ? clusterCacheExpiresTime
                    : newTokenResult.expiresTime,
                newTokenResult.refreshToken,
                config.is_cluster
                    ? clusterCacheExpiresTime
                    : newTokenResult.refreshExpiresTime,
            );
        }

        // token保存redis
        if (!onlyCache && saveTarget().isRedis) {
            const syncRedis = await Redis.client.set(
                tokenCacheKey,
                newTokenResult.accessToken,
                {
                    EX: tokenExpiresTTL,
                },
            );

            // 集群模式，通知保存到redis。供别的进程获取最新token
            if (config.is_cluster) {
                await syncRedis;
            }
        }

        // token保存至DB
        await this.tokenToDB(
            projectId,
            params.appid || params.userId,
            newTokenResult,
            isUpdate,
            params.secret,
        );
    }

    /**
     * 子类方法：参数校验
     * @param params
     */
    abstract check(params?: BaseParams): void;

    /**
     * 子类方法：查询数据库中的token
     * @param projectId
     * @param params
     */
    abstract getTokenFromDB(
        projectId: string | number,
        params: BaseParams,
    ): Promise<T>;

    /**
     * 更新数据库中的token
     * @param projectId
     * @param id appid or userId
     * @param newTokenResult
     * @param isUpdate
     * @param secret
     */
    abstract tokenToDB(
        projectId: string | number,
        id: string | number,
        newTokenResult: NewTokenResultByIn | NewTokenResultByTime,
        isUpdate: boolean,
        secret?: string,
    ): Promise<void>;

    /**
     * 子类方法：通过接口获取access_token方法
     *
     * @param projectId
     * @param params
     * @param getTokenResult
     */
    abstract getAccessTokenInSub(
        projectId: string | number,
        params: BaseParams,
        getTokenResult: T,
    ): Promise<AxiosResponse>;

    /**
     * 子类方法：处理平台的返回值
     * @param result
     * @returns 返回的token
     */
    abstract disposeResult(
        result: AxiosResponse,
    ): NewTokenResultByIn | NewTokenResultByTime;
}

export default PlatformAbstract;

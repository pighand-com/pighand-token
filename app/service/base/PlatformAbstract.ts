import { AxiosResponse } from 'axios';
import BaseAbstract, {
    BaseParams,
    BaseGetTokenResult,
    NewTokenResultByIn,
    NewTokenResultByTime,
    saveTarget,
} from './BaseAbstract';

import cacheKey from '../../common/cacheKey';
import Mysql from '../../../config/db/Mysql';
import Mongo from '../../../config/db/Mongo';
import MemoryCache from '../../../config/db/MemoryCache';
import TokenPlatformMysqlModel from '../../model/TokenPlatformMysqlModel';
import TokenPlatformMongoModel from '../../model/TokenPlatformMongoModel';
import { isTokenExpired } from '../../common/ExpiresUtil';

export interface GetTokenResult extends BaseGetTokenResult {
    appid: string;
    secret: string;
}

/**
 * 各平台类抽象类
 *
 * @params cacheExpiresIn 集群模式，本地缓存有效期。
 * 集群模式下，单进程刷新有效期，其他进程本地缓存无法感知新token；
 * 故不能从本地缓存获取到最新的token，但老token在一定时间内依然有效；
 * 具体时间参考各平台，一般设置 <= 老token有效时间
 */
abstract class PlatformAbstract extends BaseAbstract<GetTokenResult> {
    constructor(platform: string, clusterCacheExpiresIn: number) {
        super(platform, clusterCacheExpiresIn, 'platform');
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    check(params?: BaseParams) {}

    private _format(
        accessToken: string,
        expiresTime: number,
        appid: string,
        secret: string,
    ) {
        let isUpdate = !!accessToken;

        if (accessToken && !isTokenExpired(expiresTime)) {
            return {
                accessToken,
                appid,
                secret,
                isUpdate,
            };
        }

        return {
            accessToken: null,
            appid,
            secret,
            isUpdate,
        };
    }

    /**
     * 查询数据库中的token
     * @param projectId
     * @param platform
     * @param params
     */
    async getTokenFromDB(projectId: string | number, params: BaseParams) {
        const { appid } = params;

        const where: any = {
            projectId,
            platform: this.platform,
        };

        if (appid) {
            where.appid = appid;
        }

        let tokenInfo;
        if (Mysql.client) {
            tokenInfo = await TokenPlatformMysqlModel.findOne({
                where,
            });
        }

        if (!tokenInfo && Mongo.client) {
            tokenInfo = await TokenPlatformMongoModel.findOne(where);
        }

        if (!params.appid && tokenInfo.appid) {
            params.appid = tokenInfo.appid;
        }
        if (!params.secret && tokenInfo.secret) {
            params.secret = tokenInfo.secret;
        }

        return this._format(
            tokenInfo?.accessToken,
            tokenInfo?.expiresTime,
            tokenInfo?.appid,
            tokenInfo?.secret,
        );
    }

    /**
     * 更新数据库中的token
     * @param projectId
     * @param validToken
     * @param newTokenResult
     * @param isUpdate
     * @param secret
     * @returns
     */
    async tokenToDB(
        projectId: string | number,
        appid: string,
        newTokenResult: NewTokenResultByIn | NewTokenResultByTime,
        isUpdate: boolean,
        secret?: string,
    ) {
        const where: any = {
            projectId,
            platform: this.platform,
        };

        if (appid) {
            where.appid = appid;
        }

        if (saveTarget().isMysql) {
            if (isUpdate) {
                await TokenPlatformMysqlModel.update(
                    {
                        accessToken: newTokenResult.accessToken,
                        expiresTime: newTokenResult.expiresTime,
                    },
                    {
                        where,
                    },
                );
            } else {
                await TokenPlatformMysqlModel.create({
                    secret,
                    ...where,
                    accessToken: newTokenResult.accessToken,
                    expiresTime: newTokenResult.expiresTime,
                });
            }
        } else if (saveTarget().isMongo) {
            if (isUpdate) {
                await TokenPlatformMongoModel.updateOne(where, {
                    accessToken: newTokenResult.accessToken,
                    expiresTime: newTokenResult.expiresTime,
                });
            } else {
                await TokenPlatformMongoModel.create({
                    secret,
                    ...where,
                    accessToken: newTokenResult.accessToken,
                    expiresTime: newTokenResult.expiresTime,
                });
            }
        }
    }

    /**
     * 查询secret
     * 不存在有效token，获取secret；在此查询secret，减少重查数据库次数
     *
     * @param projectId
     * @param params
     * @param getTokenResult
     *
     * @returns {appid, secret}
     */
    private async getSecret(
        projectId: string | number,
        params: BaseParams,
        getTokenResult: GetTokenResult,
    ) {
        let result = {
            appid: params.appid,
            secret: params.secret,
        };

        // 1.1 - 从参数取
        if (result.secret && result.appid) {
            return result;
        }

        // 1.2 - 从已查询中取
        if (getTokenResult) {
            result = {
                appid: result.appid || getTokenResult.appid,
                secret: result.secret || getTokenResult.secret,
            };

            if (result.secret && result.appid) {
                return result;
            }
        }

        const where: any = {
            projectId,
            platform: this.platform,
        };

        if (params.appid) {
            where.appid = params.appid;
        }

        // 2.1 - 从mysql中取
        if (Mysql.client) {
            const mysqlTokenInfo = await TokenPlatformMysqlModel.findOne({
                where,
            });

            if (mysqlTokenInfo) {
                return {
                    appid: mysqlTokenInfo.appid,
                    secret: mysqlTokenInfo.secret,
                };
            }
        }

        // 2.2 - 从mongo中取
        if (Mongo.client) {
            const mongoTokenInfo = await TokenPlatformMongoModel.findOne(where);

            if (mongoTokenInfo) {
                return {
                    appid: mongoTokenInfo.appid,
                    secret: mongoTokenInfo.secret,
                };
            }
        }

        // 3 - 在没配置mysql、mongo时，从缓存中取
        if (saveTarget().isCache) {
            const tokenCacheKey = cacheKey(
                projectId,
                this.platform,
                result.appid,
            );
            const cacheInfo = MemoryCache.getCacheInfo(tokenCacheKey) || {};
            return {
                appid: cacheInfo.appid,
                secret: cacheInfo.secret,
            };
        }

        throw new Error('无法获取appid或secret');
    }

    /**
     * 调用子类实现方法，获取access_token
     * @param projectId
     * @param params
     * @param getTokenResult
     * @returns
     */
    async getAccessTokenInSub(
        projectId: string | number,
        params: BaseParams,
        getTokenResult: GetTokenResult,
    ) {
        const secretInfo = await this.getSecret(
            projectId,
            params,
            getTokenResult,
        );

        return await this.getAccessToken(secretInfo.appid, secretInfo.secret);
    }

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
}

export default PlatformAbstract;

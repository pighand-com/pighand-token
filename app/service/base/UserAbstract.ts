import { AxiosResponse } from 'axios';
import BaseAbstract, {
    BaseParams,
    BaseGetTokenResult,
    NewTokenResultByIn,
    NewTokenResultByTime,
    saveTarget,
} from './BaseAbstract';

import Mysql from '../../../config/db/Mysql';
import Mongo from '../../../config/db/Mongo';
import TokenUserMysqlModel from '../../model/TokenUserMysqlModel';
import TokenUserMongoModel from '../../model/TokenUserMongoModel';
import { isTokenExpired } from '../../common/ExpiresUtil';

export interface GetTokenResult extends BaseGetTokenResult {
    refreshToken: string;
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
        super(platform, clusterCacheExpiresIn, 'user');
    }

    check(params?: BaseParams) {
        const { userId } = params || {};
        if (!userId) {
            throw new Error('userId不能为空');
        }
    }

    private _format(
        accessToken: string,
        expiresTime: number,
        refreshToken: string,
        refreshExpiresTime: number,
    ) {
        let isUpdate = !!accessToken;

        if (accessToken && !isTokenExpired(expiresTime)) {
            if (refreshToken && isTokenExpired(refreshExpiresTime)) {
                refreshToken = null;
            }

            return {
                accessToken: accessToken,
                refreshToken,
                isUpdate,
            };
        }
    }

    /**
     * 查询数据库中的token
     * @param projectId
     * @param platform
     * @param params
     */
    async getTokenFromDB(projectId: string | number, params: BaseParams) {
        const { userId } = params;

        let tokenInfo;
        if (Mysql.client) {
            tokenInfo = await TokenUserMysqlModel.findOne({
                where: {
                    projectId,
                    platform: this.platform,
                    userId,
                },
            });
        }

        if (!tokenInfo && Mongo.client) {
            tokenInfo = await TokenUserMongoModel.findOne({
                projectId,
                platform: this.platform,
                userId,
            });
        }

        return this._format(
            tokenInfo?.accessToken,
            tokenInfo?.expiresTime,
            tokenInfo?.refreshToken,
            tokenInfo?.refreshExpiresTime,
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
        userId: number,
        newTokenResult: NewTokenResultByIn | NewTokenResultByTime,
        isUpdate: boolean,
        secret?: string,
    ) {
        const where = {
            projectId,
            platform: this.platform,
            userId,
        };

        if (saveTarget().isMysql) {
            if (isUpdate) {
                await TokenUserMysqlModel.update(
                    {
                        accessToken: newTokenResult.accessToken,
                        expiresTime: newTokenResult.expiresTime,
                        refreshToken: newTokenResult.refreshToken,
                        refreshExpiresTime: newTokenResult.refreshExpiresTime,
                    },
                    {
                        where,
                    },
                );
            } else {
                await TokenUserMysqlModel.create({
                    ...where,
                    accessToken: newTokenResult.accessToken,
                    expiresTime: newTokenResult.expiresTime,
                    refreshToken: newTokenResult.refreshToken,
                    refreshExpiresTime: newTokenResult.refreshExpiresTime,
                });
            }
        } else if (saveTarget().isMongo) {
            if (isUpdate) {
                await TokenUserMongoModel.updateOne(where, {
                    accessToken: newTokenResult.accessToken,
                    expiresTime: newTokenResult.expiresTime,
                    refreshToken: newTokenResult.refreshToken,
                    refreshExpiresTime: newTokenResult.refreshExpiresTime,
                });
            } else {
                await TokenUserMongoModel.create({
                    ...where,
                    accessToken: newTokenResult.accessToken,
                    expiresTime: newTokenResult.expiresTime,
                    refreshToken: newTokenResult.refreshToken,
                    refreshExpiresTime: newTokenResult.refreshExpiresTime,
                });
            }
        }
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
        const { code } = params;

        // 使用code获取新token
        if (code) {
            return await this.getAccessToken(projectId, this.platform, code);
        }

        // 使用refreshToken刷新token
        const { refreshToken } = getTokenResult;
        if (!refreshToken) {
            throw new Error('refreshToken过期，请重新登录');
        }

        return await this.refreshAccessToken(
            projectId,
            this.platform,
            refreshToken,
        );
    }

    /**
     * 子类方法：通过接口获取access_token方法
     *
     * @param appid
     * @param secret
     */
    abstract getAccessToken(
        projectId: string | number,
        platform: string,
        code: string,
    ): Promise<AxiosResponse>;

    /**
     * 子类方法：通过接口刷新access_token方法
     *
     * @param appid
     * @param secret
     */
    abstract refreshAccessToken(
        projectId: string | number,
        platform: string,
        refreshToken: string,
    ): Promise<AxiosResponse>;
}

export default PlatformAbstract;

import { BaseService } from '@pighand/pighand-framework-koa';

import PlatformConfig from '../common/PlatformConfig';
import { BaseParams } from './base/BaseAbstract';

import TokenUserMysqlModel from '../model/TokenUserMysqlModel';
import TokenPlatformMysqlModel from '../model/TokenPlatformMysqlModel';

/**
 * service
 */
class Service extends BaseService() {
    services: any = {};

    constructor() {
        super();

        for (const platform of Object.keys(PlatformConfig)) {
            const serviceName = (PlatformConfig as any)[platform].serviceName;
            if (serviceName) {
                this.services[platform] =
                    require(`./platform/${serviceName}`).default;
            }
        }
    }

    /**
     * 根据平台类型，获取对应的service
     * @param platform
     * @returns
     */
    getPlatformService(platform: string) {
        if (!platform) {
            super.throw('platform不能为空');
        }

        const platformInfo = this.services[platform];

        if (!platformInfo) {
            super.throw('暂不支持该平台');
        }

        return platformInfo;
    }

    /**
     * 获取token
     * @param platform
     * @param appid
     */
    async getAccessToken(
        projectId: string | number,
        platform: string,
        params: BaseParams,
    ) {
        const platformService = this.getPlatformService(platform);

        return await platformService.get(projectId, params);
    }

    /**
     * 初始化token
     * @param params
     * @returns
     */
    async init(params: any) {
        const platformService = this.getPlatformService(params.platform);

        const attributes =
            platformService.tokenType === 'user'
                ? TokenUserMysqlModel.getAttributes()
                : TokenPlatformMysqlModel.getAttributes();

        const excludeFields = ['id', 'refreshExpiresTime'];
        for (const field of Object.keys(attributes)) {
            if (!excludeFields.includes(field) && !params[field]) {
                super.throw(`${field}不能为空`);
            }
        }

        await platformService.tokenToDB(
            params.projectId,
            params.appid || params.userId,
            params,
            false,
            params.secret,
        );
    }
}

export default new Service();

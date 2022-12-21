import { BaseService } from '@pighand/pighand-framework-koa';

import Wechat from './platform/Wechat';
import PlatformEnum from './base/PlatformEnum';

/**
 * service
 */
class Service extends BaseService() {
    /**
     * 根据平台类型，获取对应的service
     * @param platform
     * @returns
     */
    getPlatformService(platform: string) {
        let platformService;

        switch (platform) {
            // 微信
            case PlatformEnum.WECHAT:
                platformService = Wechat;
                break;
            default:
                this.throw('暂不支持该平台');
                break;
        }

        return platformService;
    }

    /**
     * 获取token
     * @param platform
     * @param appid
     */
    async getAccessToken(
        projectId: string | number,
        platform: PlatformEnum,
        appid: string,
        secret?: string,
    ) {
        const platformService = this.getPlatformService(platform);

        return platformService.get(projectId, appid, secret);
    }

    /**
     * 刷新token，并返回最新token
     * @param platform
     * @param appid
     * @param secret
     * @param nowToken 当前业务中的token。
     *                  传空或任意非当前token字符，强制刷新；
     *                  如果传值，且等于redis中的token，刷新；
     *                  如果传值，且不等于redis中的token，返回redis中最新token
     */
    async refreshAccessToken(
        projectId: string | number,
        platform: PlatformEnum,
        appid: string,
        secret?: string,
        nowToken?: string,
    ) {
        const platformService = this.getPlatformService(platform);

        return platformService.getNewAccessToken(
            projectId,
            appid,
            secret,
            nowToken,
        );
    }
}

export default new Service();

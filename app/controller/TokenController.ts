import { Context } from 'koa';
import {
    BaseController,
    Controller,
    Get,
    Put,
} from '@pighand/pighand-framework-koa';

import PlatformService from '../service/Service';

/**
 * controller
 */
@Controller('/token')
class UserController extends BaseController(PlatformService) {
    /**
     * 获取token
     */
    @Get('/:projectId/:platform/:appid')
    async getAccessToken(ctx: Context) {
        const { projectId, platform, appid } = ctx.params;
        const { secret } = super.getParams(ctx);

        const accessToken = await PlatformService.getAccessToken(
            projectId,
            platform,
            appid,
            secret,
        );
        return super.result(ctx, accessToken);
    }

    /**
     * 刷新token
     */
    @Put('/:projectId/:platform/:appid')
    async refreshAccessToken(ctx: Context) {
        const { projectId, platform, appid } = ctx.params;
        const { secret, nowToken } = super.getParams(ctx);

        const accessToken = await PlatformService.refreshAccessToken(
            projectId,
            platform,
            appid,
            secret,
            nowToken,
        );
        return super.result(ctx, accessToken);
    }
}

export default UserController;

import { Context } from 'koa';
import {
    BaseController,
    Controller,
    Post,
} from '@pighand/pighand-framework-koa';

import PlatformService from '../service/Service';

/**
 * controller
 */
@Controller()
class TokenController extends BaseController(PlatformService) {
    /**
     * 获取token
     */
    @Post(':platform/:projectId')
    async getAccessToken(ctx: Context) {
        const { projectId, platform } = ctx.params;
        const params = super.getParams(ctx);

        const result = await PlatformService.getAccessToken(
            projectId,
            platform,
            params,
        );
        return super.result(ctx, result);
    }

    /**
     * 初始化
     */
    @Post('init')
    async init(ctx: Context) {
        const params = super.getParams(ctx);

        await PlatformService.init(params);
        return super.result(ctx);
    }
}

export default TokenController;

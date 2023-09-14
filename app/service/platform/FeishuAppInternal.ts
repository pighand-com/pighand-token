import axios from 'axios';
import { AxiosResponse } from 'axios';

import PlatformConfig from '../../common/PlatformConfig';
import PlatformAbstract from '../base/PlatformAbstract';
import { BaseParams } from '../base/BaseAbstract';

const config = PlatformConfig.feishu_app_internal;

interface ResultInterface {
    app_access_token: string;

    // 凭证有效时间，单位秒
    expire: number;

    /**
     *  0	请求成功
     */
    code: number;

    // 错误信息
    msg: string;
}

/**
 * 飞书 - 自建应用app_access_token
 */
class FeishuAppInternal extends PlatformAbstract {
    constructor() {
        super(config.type, 4 * 60);
    }

    async getAccessToken(appid: string, secret: string) {
        const url = config.url;
        return await axios.post(url, {
            app_id: appid,
            app_secret: secret,
        });
    }

    disposeResult(result: AxiosResponse<ResultInterface>) {
        const { status, data } = result;

        if (status !== 200) {
            throw new Error(`${config.tip}: ${data}`);
        }

        const { code, msg, app_access_token, expire } = data;
        if (code !== 0) {
            throw new Error(`${config.tip}(${code}): ${msg}`);
        }

        return {
            accessToken: app_access_token,
            expiresIn: expire,
        };
    }
}

export default new FeishuAppInternal();

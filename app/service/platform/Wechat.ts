import axios from 'axios';
import { AxiosResponse } from 'axios';

import PlatformConfig from '../../common/PlatformConfig';
import PlatformAbstract from '../base/PlatformAbstract';

const config = PlatformConfig.wechat;

interface ResultInterface {
    // 微信token
    access_token: string;

    // 凭证有效时间，单位秒
    expires_in: number;

    /**
     *  0	请求成功
     *  -1	系统繁忙，此时请开发者稍候再试
     *  40001	AppSecret 错误或者 AppSecret 不属于这个小程序，请开发者确认 AppSecret 的正确性
     *  40002	请确保 grant_type 字段值为 client_credential
     *  40013	不合法的 AppID，请开发者检查 AppID 的正确性，避免异常字符，注意大小写
     */
    errcode: number;

    // 错误信息
    errmsg: string;
}

/**
 * 微信接口返回值
 */
class Wechat extends PlatformAbstract {
    constructor() {
        super(config.type, 4 * 60);
    }

    async getAccessToken(appid: string, secret: string) {
        const url = config.url
            .replace('${appid}', appid)
            .replace('${secret}', secret);
        return await axios.get(url);
    }

    disposeResult(result: AxiosResponse<ResultInterface>) {
        const { status, data } = result;

        if (status !== 200) {
            throw new Error(`${config.tip}: ${data}`);
        }

        const { access_token, expires_in, errcode, errmsg } = data;
        if (errcode && errcode !== 0) {
            throw new Error(`${config.tip}(${errcode}): ${errmsg}`);
        }

        return {
            accessToken: access_token,
            expiresIn: expires_in,
        };
    }
}

export default new Wechat();

import axios from 'axios';
import { AxiosResponse } from 'axios';

import PlatformConfig from '../../common/PlatformConfig';
import UserAbstract from '../base/UserAbstract';

import FeishuAppInternal from './FeishuAppInternal';

const config = PlatformConfig.feishu_user_web;

interface ResultInterface {
    /**
     *  0	请求成功
     */
    code: number;

    // 错误信息
    msg: string;

    access_token: string;
    expires_in: number;
    refresh_token: string;
    refresh_expires_in: number;

    name: string;
    en_name: string;
    avatar_url: string;
    avatar_thumb: string;
    avatar_middle: string;
    avatar_big: string;
    open_id: string;
    union_id: string;
    email: string;
    enterprise_email: string;
    user_id: string;
    mobile: string;
    tenant_key: string;
    sid: string;
}

/**
 * 飞书 - 用户网页授权
 */
class FeishuUserWeb extends UserAbstract {
    constructor() {
        super(config.type, 4 * 60);
    }

    async getAccessToken(
        projectId: string | number,
        platform: string,
        code: string,
    ) {
        const appAccessToken = await FeishuAppInternal.get(projectId);

        return await axios.post(
            config.url,
            {
                grant_type: 'authorization_code',
                code: code,
            },
            {
                headers: {
                    Authorization: `Bearer ${appAccessToken.accessToken}`,
                },
            },
        );
    }

    async refreshAccessToken(
        projectId: string | number,
        platform: string,
        refreshToken: string,
    ) {
        const appAccessToken = await FeishuAppInternal.get(projectId);

        return await axios.post(
            PlatformConfig.feishu_refresh_access_token.url,
            {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            },
            {
                headers: {
                    Authorization: `Bearer ${appAccessToken.accessToken}`,
                },
            },
        );
    }

    disposeResult(result: AxiosResponse<ResultInterface>) {
        const { status, data } = result;

        if (status !== 200) {
            throw new Error(`${config.tip}: ${data}`);
        }

        const {
            code,
            msg,
            access_token,
            expires_in,
            refresh_token,
            refresh_expires_in,
            name,
            en_name,
            avatar_url,
            avatar_thumb,
            avatar_middle,
            avatar_big,
            open_id,
            union_id,
            email,
            enterprise_email,
            user_id,
            mobile,
            tenant_key,
            sid,
        } = data;
        if (code !== 0) {
            throw new Error(`${config.tip}(${code}): ${msg}`);
        }

        return {
            accessToken: access_token,
            expiresIn: expires_in,
            refreshToken: refresh_token,
            refreshExpiresIn: refresh_expires_in,

            name,
            en_name,
            avatar_url,
            avatar_thumb,
            avatar_middle,
            avatar_big,
            open_id,
            union_id,
            email,
            enterprise_email,
            user_id,
            mobile,
            tenant_key,
            sid,
        };
    }
}

export default new FeishuUserWeb();

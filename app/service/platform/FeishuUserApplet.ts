import axios from 'axios';
import { AxiosResponse } from 'axios';

import PlatformConfig from '../../common/PlatformConfig';
import UserAbstract from '../base/UserAbstract';

import FeishuAppInternal from './FeishuAppInternal';

const config = PlatformConfig.feishu_user_applet;

interface ResultInterface {
    /**
     *  0	请求成功
     */
    code: number;

    // 错误信息
    msg: string;

    data: {
        access_token: string;
        expires_in: number;
        refresh_token: string;
        refresh_expires_in: number;

        open_id: string;
        employee_id: string;
        session_key: string;
        tenant_key: string;
    };
}

/**
 * 飞书 - 用户小程序授权
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

            data: {
                access_token,
                expires_in,
                refresh_token,

                open_id,
                employee_id,
                session_key,
                tenant_key,
            },
        } = data;
        if (code !== 0) {
            throw new Error(`${config.tip}(${code}): ${msg}`);
        }

        const rs: any = {
            accessToken: access_token,
            refreshToken: refresh_token,
            refreshExpiresIn: 30 * 24 * 60 * 60,

            open_id,
            employee_id,
            session_key,
            tenant_key,
        };

        if (
            PlatformConfig.feishu_refresh_access_token.url.endsWith(
                result.request.path,
            )
        ) {
            rs.expiresIn = expires_in;
        } else {
            // refreshToken 默认 30 天过期
            rs.expiresTime = expires_in;
        }

        return rs;
    }
}

export default new FeishuUserWeb();

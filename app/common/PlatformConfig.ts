const config: {
    [key: string]: {
        tip: string;
        type?: string;
        serviceName?: string;
        url: string;
    };
} = {
    // 微信
    wechat: {
        tip: '获取微信access_token错误',
        type: 'wechat',
        serviceName: 'Wechat',
        url: 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}',
    },

    // 飞书 - 自建应用app_access_token
    feishu_app_internal: {
        tip: '飞书app_access_token错误',
        type: 'feishu_app_internal',
        serviceName: 'FeishuAppInternal',
        url: 'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
    },

    // 飞书 - web端用户access_token
    feishu_user_web: {
        tip: '飞书web用户错误',
        type: 'feishu_user_web',
        serviceName: 'FeishuUserWeb',
        url: 'https://open.feishu.cn/open-apis/authen/v1/access_token',
    },

    // 飞书 - 小程序用户access_token
    feishu_user_applet: {
        tip: '飞书小程序用户错误',
        type: 'feishu_user_applet',
        serviceName: 'FeishuUserApplet',
        url: 'https://open.feishu.cn/open-apis/mina/v2/tokenLoginValidate',
    },

    // 飞书 - 刷新user_access_token
    feishu_refresh_access_token: {
        tip: '飞书refresh_access_token错误',
        url: 'https://open.feishu.cn/open-apis/authen/v1/refresh_access_token',
    },
};

export default config;

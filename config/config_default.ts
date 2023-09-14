import { ConfigInterface } from './ConfigInterface';

/**
 * 默认环境配置文件
 */
const config_default: ConfigInterface = {
    port: 3050,

    is_enable_schedule: true,

    token_premature_failure: 60 * 5,

    // 每天0点刷新过期token
    refresh_token_schedule: { hour: 0 },

    refresh_token_premature_failure: 60 * 60 * 24,

    save_model: ['auto'],

    is_cluster: 'auto',
};

export default config_default;

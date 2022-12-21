import { ConfigInterface } from './ConfigInterface';

/**
 * 默认环境配置文件
 */
const config_default: ConfigInterface = {
    port: 3050,

    is_enable_schedule: true,

    premature_failure: 60 * 5,

    corn_interval: 60,

    save_model: ['auto'],

    is_cluster: 'auto',
};

export default config_default;

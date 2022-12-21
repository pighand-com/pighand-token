import config_dev from './config_dev';
import config_test from './config_test';
import config_default from './config_default';
import config_production from './config_production';
import { ConfigInterface } from './ConfigInterface';

/**
 * 配置文件处理
 */
// 根据环境变量获取相应配置
let envConfig: ConfigInterface = {};
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'uat') {
    envConfig = config_test;
} else if (
    process.env.NODE_ENV === 'pro' ||
    process.env.NODE_ENV === 'prod' ||
    process.env.NODE_ENV === 'production'
) {
    envConfig = config_production;
} else {
    envConfig = config_dev;
}

// 配置文件生效级别
// 1级 - 环境变量
// 2级 - NODE_ENV指定的配置文件
// 3级 - 默认配置文件
let config: ConfigInterface = {
    ...config_default,
    ...envConfig,
};

// 判断环境变量
const { is_enable_env } = config;
if (!is_enable_env || is_enable_env === true) {
    config = {
        ...config,
        ...process.env,
    };
}

export default config;

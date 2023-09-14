/**
 * 配置接口
 */

export interface ConfigInterface {
    // 是否启用环境变量配置
    is_enable_env?: boolean;

    // 端口
    port?: number;

    // mysql相关配置
    mysql_database?: string;
    mysql_username?: string;
    mysql_password?: string;
    mysql_host?: string;
    mysql_port?: number;
    mysql_log?: any;

    // mongo
    mongo_auth?: string;
    mongo_user?: string;
    mongo_pwd?: string;
    mongo_host?: string;
    mongo_port?: number;
    mongo_db?: string;
    mongo_srv?: boolean;

    // redis相关配置
    redis_host?: string;
    redis_pwd?: string;
    redis_port?: number;
    redis_db?: number;

    // 是否启动定时任务，刷新过期token
    is_enable_schedule?: boolean;

    /**
     * 提前失效时间，单位秒
     *
     * token提前过期时间。防止真正过期时，还没更新token
     * 一般设置为刷新token，旧token有效时间。比如微信，获取新token，就token5分钟内有效
     */
    token_premature_failure?: number;

    /**
     * 刷新refresh_token定时任务规则
     * 未设置，或者未连接任何数据库，定时任务不起动。
     *
     * @see https://github.com/node-schedule/node-schedule
     */
    refresh_token_schedule?: object;

    /**
     * 定时任务重，refresh_token提前失效时间，单位：秒
     * 一般设置为定时任务的间隔时间
     *
     * refresh_token在存储时，跟token逻辑一样，已提前失效{token_premature_failure}秒；
     * 但由于定时任务有间隔，可能间隔时间超过提前失效时间，导致无法刷新。所以定时任务中，再次提前失效
     *
     * eg：每天0点刷新
     * token真实失效时间是1:06
     * 系统中失效时间是1:01
     * 未设置{refresh_token_premature_failure},定时任务则不会刷新这个token
     * 由于查询间隔内（即24小时）都有可能失效。所以设置{refresh_token_premature_failure}为24小时，定时任务会刷新这个token
     */
    refresh_token_premature_failure?: number;

    /**
     * token保存方式
     *
     * auto：自动模式（默认）。缓存+redis > 缓存+mysql | 缓存+mongo
     * all：全部保存模式
     * mysql：存入mysql
     * mongo：存入mongo
     * redis：存入redis
     * cache：存入本地缓存
     */
    save_model?: Array<'auto' | 'all' | 'mysql' | 'mongo' | 'redis' | 'cache'>;

    /**
     * 是否集群模式。使用redis锁来更新token，默认true
     * 如果是单进程并且启用本地缓存，推荐设置成false，延长本地缓存有效期，提高性能
     *
     * auto：自动默认。连接redis，自动启动；未连接，不启动
     * true：启动集群模式，未连接redis报错
     * false：不启动集群模式
     */
    is_cluster?: boolean | 'auto';
}

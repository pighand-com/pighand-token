## pighand-token

统一管理三方 access_token。
解决不同环境，单独处理 access_token，致使 access_token 过期问题。

支持微信、支付宝（开发中）、飞书（开发中）。\
通过接口查询、刷新 access_token。\
定时更新 access_token。从本地缓存、数据库中读取过期的 token 更新（可关闭）\
access_token 可保存至 本地缓存、redis、mysql、mongo，根据场景自动选择最优查询方案。也可不保存，直接通过接口实时获取。

<img src="https://github.com/pighand-com/pighand-token/blob/main/public/flowChat.png?raw=true">

### 运行

1. 初始化数据至 mysql、mongo（非必须，可使用本地缓存、redis），脚本：/public/mongo.js、/public/mysql.sql

2. 依赖环境

    > nodejs > 12
    > pm2（非必须）

3. 安装依赖、编译

```
yarn build
```

4. 启动

node 启动

```
# 开发环境
yarn dev

# 测试环境
yarn test

# 生产环境
yarn pro
```

pm2 启动

```
# 开发环境
yarn pm2:dev 或 yarn pm2:develop

# 测试环境
yarn pm2:test

# 生产环境
yarn pm2:pro 或 yarn pm2:prod 或 yarn pm2:production
```

### 配置

1. 配置文件

```
# 开发环境默认配置
/config/config_dev.ts

# 测试环境默认配置
/config/config_test.ts

# 生产环境默认配置
/config/config_production.ts

# 默认配置
/config/config_default.ts
```

根据环境变量，自动选用相关配置文件中的配置。
其他环境配置文件中没有的配置项，会使用 config_default 中的配置。

参数优先级：
环境变量 > config_dev/test/production > config_default

2. 支持参数

```
# 是否启用环境变量配置，默认true。如果启用，会将环境变量中的信息同步到配置中
is_enable_env?: boolean;

# 服务端口
port: number;

# mysql相关配置
mysql_database: string;
mysql_username: string;
mysql_password: string;
mysql_host: string;
mysql_port: number;
mysql_log: false | console.log;

# redis相关配置
redis_host: string;
redis_pwd: string;
redis_port: number;
redis_db: number;

# mongo相关配置
mongo_auth?: string;
mongo_user?: string;
mongo_pwd?: string;
mongo_host?: string;
mongo_port?: number;
mongo_db?: string;
mongo_srv?: boolean;

# 是否启动定时任务，刷新过期token，默认true
is_enable_schedule: boolean;

/**
 * 提前失效时间，单位秒
 *
 * token提前过期时间。防止真正过期时，还没更新token
 * 一般设置为刷新token，旧token有效时间。比如微信，获取新token，就token5分钟内有效
 */
premature_failure?: number;

/**
 * token定时任务查询间隔，单位秒。非>0的数字，或者未连接任何数据库，定时任务不起动。
 */
corn_interval?: number;

/**
 * token保存方式
 *
 * auto：自动模式（默认）。缓存+redis(如果配置redis) > 缓存+mysql(如果配置redis) | 缓存+mongo(如果配置redis)
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
```

3. 本地缓存

```
# 本地缓存配置
/config/db/MemoryCache.ts

如果不使用任何库，可直接配置appid、secret到本地缓存。
具体配置方式参考缓存配置文件
```

### 接口

1. 获取 token
    > GET /token/:projectId/:platform/:appid?secret=

params:
| 参数 | 类型 | 必须 | 备注 |
| :-------- | ------ | ---- | ---------------------------- |
| projectId | string | 是 | 项目 idtoken |
| platform | string | 是 | 'wechat'、'alipay'、'feishu' |
| appid | string | 是 | 对应平台的 appi |

query:

| 参数   | 类型   | 必须 | 备注                                       |
| :----- | ------ | ---- | ------------------------------------------ |
| secret | string | 否   | 如果传此参数，直接使用此 secret 查询 token |

response:

```
{
    "code": 200,
    "data": "access_token",
    "error": ""
}
```

查询顺序：
本地缓存(如果未关闭) > redis(如果已配置) > mysql | mongo(如果已配置) > 三方接口

2. 刷新 token
    > PUT /token/:projectId/:platform/:appid

params:
| 参数 | 类型 | 必须 | 备注 |
| :-------- | ------ | ---- | ---------------------------- |
| projectId | string | 是 | 项目 idtoken |
| platform | string | 是 | 'wechat'、'alipay'、'feishu' |
| appid | string | 是 | 对应平台的 appi |

body:

| 参数     | 类型   | 必须 | 备注                                                                                                        |
| :------- | ------ | ---- | ----------------------------------------------------------------------------------------------------------- |
| secret   | string | 否   | 如果传此参数，直接使用此 secret 查询 token                                                                  |
| nowToken | string | 否   | 如果传此参数，则使用 nowToken 与库中 token 对比。<br>相同则刷新；不同返回库中 token。<br><br>不传则强制刷新 |

response:

```
{
    "code": 200,
    "data": "access_token",
    "error": ""
}
```

刷新后，存储逻辑：

-   redis（如果已配置），并设置失效时间；
-   本地缓存，并设置失效时间；
-   mysql

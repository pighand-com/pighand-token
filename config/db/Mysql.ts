import { Sequelize } from 'sequelize-typescript';
import config from '../config';
import { DBAbstract, DBTypeEnum } from './DBAbstract';

const {
    mysql_database,
    mysql_username,
    mysql_password,
    mysql_host,
    mysql_port = 3306,
    mysql_log = false,
} = config;

class Mysql extends DBAbstract<Sequelize> {
    constructor() {
        super(DBTypeEnum.MYSQL, !!mysql_host);
    }

    async DBConnect() {
        const sequelize = new Sequelize(
            mysql_database,
            mysql_username,
            mysql_password,
            {
                host: mysql_host,
                port: mysql_port,
                dialect: 'mysql',
                logging: mysql_log,
                timezone: '+08:00',
                define: {
                    timestamps: false,
                    freezeTableName: true,
                },
                pool: {
                    max: 10,
                    min: 1,
                    acquire: 30000,
                    idle: 10000,
                },
                dialectOptions: {
                    decimalNumbers: true,
                    maxPreparedStatements: 1000,
                },
                models: [__dirname + '/../../app/model/**/*MysqlModel.*'],
            },
        );

        await sequelize.authenticate();

        return sequelize;
    }
}

const mysql = new Mysql();

export default mysql;

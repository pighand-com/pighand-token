import { connect, Mongoose } from 'mongoose';

import config from '../config';
import { DBAbstract, DBTypeEnum } from './DBAbstract';

const {
    mongo_auth,
    mongo_user,
    mongo_pwd,
    mongo_host,
    mongo_port,
    mongo_db,
    mongo_srv,
} = config;

class Mongo extends DBAbstract<Mongoose> {
    constructor() {
        super(DBTypeEnum.MONGO, !!mongo_host);
    }

    async DBConnect() {
        const port = mongo_port ? ':' + mongo_port : '';
        const auth = mongo_auth ? '?authSource=' + mongo_auth : '';

        const url = `mongodb${
            mongo_srv ? '+srv' : ''
        }://${mongo_host}${port}/${mongo_db}${auth}`;

        const contentConfig: any = {
            user: mongo_user,
            pass: mongo_pwd,
            useUnifiedTopology: true,
            useNewUrlParser: true,
            minPoolSize: 1,
            maxPoolSize: 10,
        };

        return await connect(url, contentConfig);
    }
}

const mongo = new Mongo();

export default mongo;

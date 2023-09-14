import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'token_platform',
})
class TokenMysqlModel extends Model {
    @Column({
        field: 'project_id',
        type: DataType.BIGINT,
    })
    declare projectId: number;

    @Column(DataType.STRING)
    declare platform: string;

    @Column(DataType.STRING)
    declare appid: string;

    @Column(DataType.STRING)
    declare secret: string;

    @Column({
        field: 'access_token',
        type: DataType.STRING,
    })
    declare accessToken: string;

    @Column({
        field: 'expires_time',
        type: DataType.BIGINT,
    })
    declare expiresTime: number;
}

export default TokenMysqlModel;

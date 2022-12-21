import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'token',
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
    declare type: string;

    @Column(DataType.STRING)
    declare appid: string;

    @Column(DataType.STRING)
    declare secret: string;

    @Column(DataType.STRING)
    declare token: string;

    @Column({
        field: 'expire_time',
        type: DataType.BIGINT,
    })
    declare expireTime: number;
}

export default TokenMysqlModel;

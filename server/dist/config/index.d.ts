export declare const config: {
    port: number;
    nodeEnv: string;
    db: {
        url: string | undefined;
        ssl: boolean;
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    clientUrl: string;
    clientUrls: string[];
    execution: {
        dockerEnabled: boolean;
        serviceUrl: string | undefined;
        serviceToken: string | undefined;
        timeout: number;
        memoryLimit: string;
        cpuLimit: string;
    };
};
//# sourceMappingURL=index.d.ts.map
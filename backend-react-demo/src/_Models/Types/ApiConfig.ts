export type ApiConfig = {
    appInfo: {
        name: string;
        author: string;
        version: string;
    }
    server: {
        host: string;
        port: number;
    }
    corsOptions: {
        origin: string | string[];
        methods: string | string[];
        allowedHeaders: string | string[];
        exposedHeaders?: string | string[];
        credentials?: boolean;
        maxAge?: number;
    }
    authConfig: {
        accessTokenSecret: string;
        refreshTokenSecret: string;
        accessTokenExpiry: any;
        refreshTokenExpiry: any;
        refreshTokenCookieName: string;
        cookieMaxAge: number;
    }
    demoSettings: {
        useMockData: boolean;
    }
}

export type FeConfig = {
    appInfo: {
        name: string;
        author: string;
        version: string;
        canonicalUrl: string;
    }
    webApi: {
        baseUrl: string;
        apiUrl: string;
        configUrl: string;
    }
}
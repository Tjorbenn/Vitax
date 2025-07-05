export enum Endpoint {
    ITISFromCommonName = "getITISTermsFromCommonName"
};

export type Response = Entry[]

export type Entry = {
};

export enum ParameterKey {
    Term = "srchKey"
}

export class Request {
    baseURL: string = "https://www.itis.gov/ITISWebService/services/ITISService/";
    endpoint?: Endpoint;
    parameters: URLSearchParams = new URLSearchParams();

    constructor(endpoint?: Endpoint) {
        this.endpoint = endpoint;
    }

    addParameter(key: ParameterKey, value: string | number | boolean): this {
        this.parameters.append(key, String(value));
        return this;
    }

    addParameters(params: URLSearchParams): this {
        for (const [key, value] of params) {
            this.parameters.append(key, value);
        }
        return this;
    }

    getParameters(): URLSearchParams {
        return this.parameters;
    }

    setEndpoint(endpoint: Endpoint): this {
        this.endpoint = endpoint;
        return this;
    }

    async Send(): Promise<Response> {
        if (!this.endpoint) {
            throw new Error("Endpoint is not set!");
        }
        const requestUrl = new URL(this.endpoint + "/", this.baseURL);
        requestUrl.search = this.parameters.toString();

        const response = await fetch(requestUrl, { method: "GET" });

        if (!response.ok) {
            throw new Error("ITIS-API response was not ok: " + response.statusText);
        }
        const json = await response.json();

        if (json.length < 1) {
            throw new Error(`Empty response to ${requestUrl} from ITIS-API`);
        }

        return json;
    }
}



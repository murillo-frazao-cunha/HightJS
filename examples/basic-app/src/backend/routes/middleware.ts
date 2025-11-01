import {HightJSRequest, HightJSResponse} from "hightjs";

export function exampleMiddleware(request: HightJSRequest, // HWebRequest será importado onde necessário
                                          params: { [key: string]: string },
                                          next: () => Promise<HightJSResponse>): Promise<HightJSResponse> | HightJSResponse {
    console.log(`Request received for ${request.url}`);
    // Você pode adicionar lógica personalizada aqui, como autenticação, logging, etc.

    // Chama o próximo middleware ou manipulador de rota
    return next();
}

export function example2Middleware(request: HightJSRequest, // HWebRequest será importado onde necessário
                                          params: { [key: string]: string },
                                          next: () => Promise<HightJSResponse>): Promise<HightJSResponse> | HightJSResponse {
    console.log(`Second middleware for ${request.url}`);
    // Você pode adicionar lógica personalizada aqui, como autenticação, logging, etc.

    // Chama o próximo middleware ou manipulador de rota
    return next();
}

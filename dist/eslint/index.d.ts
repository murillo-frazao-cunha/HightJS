export let rules: {
    'require-use-client': {
        meta: {
            type: string;
            docs: {
                description: string;
                category: string;
                recommended: boolean;
            };
            fixable: string;
            schema: never[];
            messages: {
                missingUseClient: string;
            };
        };
        create(context: any): {
            Program(node: any): void;
            ImportDeclaration(node: any): void;
            CallExpression(node: any): void;
            'Program:exit'(): void;
        };
    };
};
export namespace configs {
    namespace recommended {
        export let plugins: string[];
        let rules_1: {
            'hightjs/require-use-client': string;
        };
        export { rules_1 as rules };
    }
}

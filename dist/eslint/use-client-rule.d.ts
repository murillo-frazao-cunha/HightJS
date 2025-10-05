export namespace meta {
    let type: string;
    namespace docs {
        let description: string;
        let category: string;
        let recommended: boolean;
    }
    let fixable: string;
    let schema: never[];
    namespace messages {
        let missingUseClient: string;
    }
}
export function create(context: any): {
    Program(node: any): void;
    ImportDeclaration(node: any): void;
    CallExpression(node: any): void;
    'Program:exit'(): void;
};

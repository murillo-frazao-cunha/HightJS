import { type AnchorHTMLAttributes, type ReactNode } from 'react';
interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    children: ReactNode;
}
export declare function Link({ href, children, ...props }: LinkProps): import("react/jsx-runtime").JSX.Element;
export {};

import React, { type AnchorHTMLAttributes, type ReactNode } from 'react';
import { router } from '../client/clientRouter';

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    children: ReactNode;
}

export function Link({ href, children, ...props }: LinkProps) {
    const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        // Usa o novo sistema de router
        await router.push(href);
    };

    return (
        <a href={href} {...props} onClick={handleClick}>
            {children}
        </a>
    );
}

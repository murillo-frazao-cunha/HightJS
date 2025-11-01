import React from 'react';

export default function App() {


    const globalStyles = `
        
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            box-sizing: border-box;
        }

        *, *:before, *:after {
            box-sizing: inherit;
        }

        body {
            color: #000;
            background: linear-gradient(to bottom, #e9e9e9, #ffffff);
            background-attachment: fixed;
            
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
            padding: 20px;
        }
        
        .error-container {
             /* Remove qualquer estilo de "card" anterior */
        }

        .hight-error-h1 {
            border-right: 1px solid rgba(0, 0, 0, .3);
        }

        @media (prefers-color-scheme: dark) {
            body {
                color: #fff;
                background: linear-gradient(to bottom, #222, #000);
            }
            .hight-error-h2 {
                color: white;  
             }
            .hight-error-h1 {
                color: white;
                border-right: 1px solid rgba(255, 255, 255, .3);
            }
        }
    `;

    // Estilos inline do seu exemplo original
    const h1Styles = {
        display: 'inline-block',
        margin: '0px 20px 0px 0px',
        padding: '0px 23px 0px 0px',
        fontSize: '24px',
        fontWeight: '500',
        verticalAlign: 'top',
        lineHeight: '49px'
    };

    const h2ContainerStyles = {
        display: 'inline-block',
        verticalAlign: 'top', // Alinha com o topo do H1
    };

    const h2Styles = {
        fontSize: '14px',
        fontWeight: '400',
        lineHeight: '49px',
        margin: '0px'
    };


    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

            <div className="error-container">
                <h1
                    className="hight-error-h1"
                    style={h1Styles}
                >
                    404
                </h1>
                <div style={h2ContainerStyles}>
                    <h2 style={h2Styles} className="hight-error-h2">
                        This page cannot be found. ITS NOT THE DEFAULT 404 PAGE.
                    </h2>
                </div>
            </div>
        </>
    );
}


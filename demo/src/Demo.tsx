import {pdf2array, pdfjs} from "pdf2array";
import React, {ChangeEvent} from 'react';
import './Demo.css';

// Set up the worker for pdfs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;


const Demo: React.FC = () => {
    const [file, setFile] = React.useState<File | undefined>();
    const [data, setData] = React.useState<string[][] | undefined>();
    const [error, setError] = React.useState<string | undefined>();

    // Set the file state when the selected file is changed by the user
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        setFile(event.currentTarget.files?.item(0) ?? undefined);
    }

    // When the file changes load the data and convert to an array using pdf2array
    React.useEffect(() => {
        let mounted = true;

        (async () => {
            if (!!file) {
                try {
                    const buffer = await file.arrayBuffer();
                    const data = await pdf2array(buffer)

                    if (mounted) {
                        setData(data);
                    }
                }
                catch (e: any) {
                    console.error(e)
                    if (mounted) {
                        setError(e.message);
                    }
                }
            }
        })();

        return () => { mounted = false; }
    }, [file, setData, setError]);

    return (
        <div className="demo">
            <h1>pdf2array demo</h1>

            <div>
                Load a PDF file below to convert it into an array
                using <a href="https://github.com/tonyroberts/pdf2array">pdf2array</a>.
            </div>

            <form>
                <input
                    type={"file"}
                    accept=".pdf, application/pdf"
                    onChange={handleFileChange}
                />
            </form>

            {(() => {
                if (!!error) {
                    return <div className="error">An error occurred: {error}</div>;
                }
            })()}

            {(() => {
                if (!!data) {
                    const rows = data.map((row, r) => {
                        return <tr key={r}>
                            {row.map((item, c) => {
                                return <td key={c}>{item}</td>
                            })}
                        </tr>
                    });

                    return <div>
                        <table>{rows}</table>
                    </div>;
                }
            })()}

        </div>
    );
}


export default Demo;

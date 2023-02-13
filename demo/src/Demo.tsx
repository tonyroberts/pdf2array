import {pdf2array, Pdf2ArrayOptions, pdfjs} from "pdf2array";
import React, {ChangeEvent} from 'react';
import produce from 'immer';
import './Demo.scss';


// Set up the worker for pdfs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;


const Demo: React.FC = () => {
    const [file, setFile] = React.useState<File | undefined>();
    const [options, setOptions] = React.useState<Pdf2ArrayOptions>({});
    const [data, setData] = React.useState<string[][] | undefined>();
    const [error, setError] = React.useState<string | undefined>();

    // Set the file state when the selected file is changed by the user
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        setFile(event.currentTarget.files?.item(0) ?? undefined);
    }

    const handleSetPage = (event: ChangeEvent<HTMLInputElement>) => {
        setOptions(produce((draft) => {
            const value = +event.target.value;
            draft.pages = isNaN(value) || value <= 0 ? undefined : [value];
        }))
    }

    const handleStripFooters = (event: ChangeEvent<HTMLInputElement>) => {
        setOptions(produce((draft) => {
            draft.stripFooters = event.target?.checked;
        }))
    }

    const handleStripSuperscript = (event: ChangeEvent<HTMLInputElement>) => {
        setOptions(produce((draft) => {
            draft.stripSuperscript = event.target?.checked;
        }))
    }

    const handleSetSlice = (event: ChangeEvent<HTMLInputElement>) => {
        setOptions(produce((draft) => {
            draft.slice = event.target?.checked;
        }))
    }

    // When the file changes load the data and convert to an array using pdf2array
    React.useEffect(() => {
        let mounted = true;

        (async () => {
            if (!!file) {
                try {
                    const buffer = await file.arrayBuffer();
                    const data = await pdf2array(buffer, options)

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
    }, [file, options, setData, setError]);

    return (
        <div className="demo">
            <h1>pdf2array demo</h1>

            <div>
                Load a PDF file below to convert it into an array
                using <a href="https://github.com/tonyroberts/pdf2array">pdf2array</a>.
            </div>

            <form>
                <div className={"options"}>
                    <div>
                        <input
                            type={"file"}
                            accept=".pdf, application/pdf"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div>
                        <label htmlFor={'page-input'}>Page</label>
                        <input
                            id={'page-input'}
                            type={"number"}
                            value={(options.pages ? options.pages[0] : '') ?? ''}
                            onChange={handleSetPage}
                        />
                    </div>
                    <div>
                        <input
                            id={'strip-footers-checkbox'}
                            type={"checkbox"}
                            checked={!!options.stripFooters}
                            onChange={handleStripFooters}
                        />
                        <label htmlFor={'strip-footers-checkbox'}>Strip Footers</label>
                    </div>
                    <div>
                        <input
                            id={'strip-superscript-checkbox'}
                            type={"checkbox"}
                            checked={!!options.stripSuperscript}
                            onChange={handleStripSuperscript}
                        />
                        <label htmlFor={'strip-superscript-checkbox'}>Strip Superscript</label>
                    </div>
                    <div>
                        <input
                            id={'slice-checkbox'}
                            type={"checkbox"}
                            checked={!!options.slice}
                            onChange={handleSetSlice}
                        />
                        <label htmlFor={'slice-checkbox'}>SLICE</label>
                    </div>
                </div>
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
                        <table><tbody>{rows}</tbody></table>
                    </div>;
                }
            })()}

        </div>
    );
}


export default Demo;

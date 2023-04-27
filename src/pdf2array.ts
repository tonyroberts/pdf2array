import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import {TextItem} from "pdfjs-dist/types/src/display/api";
import {stripFooters, StripFootersOptions} from "./filters/footers";
import {stripSuperscripts, StripSuperscriptOptions} from "./filters/superscript";
import {applySlice, SliceOptions} from "./filters/slice";


export type TextItemWithPosition = TextItem & {
    x: number;
    y: number;
}


export interface Row {
    page: number;
    rowNumber: number;
    y: number;
    xs: number[];
    items: TextItemWithPosition[];
}


export interface Pdf2ArrayOptions {
    pages?: number[];
    stripFooters?: boolean | StripFootersOptions;
    stripSuperscript?: boolean | StripSuperscriptOptions;
    slice?: boolean | SliceOptions;
}


/**
 * Transform an (x, y) coordinate by a pdf transformation matrix.
 * @param x
 * @param y
 * @param transform
 * @private
 */
function _transform(x: number, y: number, transform: number[]) {
    // [x', y', 1] = [x, y, 1] * [a, b, 0]
    //                           [c, d, 0]
    //                           [e, f, 1]
    const [a, b, c, d, e, f] = transform;
    const xt = x * a + y * c + e;
    const yt = x * b + y * d + f;
    return [xt, yt];
}

/**
 * Loads a PDF file and returns text values arranged into a
 * 2d array.
 *
 * @param data
 * @param options
 */
export async function pdf2array(data: ArrayBuffer, options?: Pdf2ArrayOptions): Promise<string[][]> {
    const doc = await pdfjs.getDocument(data).promise;

    let rows: Row[] = [];
    let currentRow: Row = undefined;

    for (let i = 0; i < doc.numPages; ++ i) {
        if (!!options?.pages && options.pages.findIndex((p) => p === i+1) < 0) {
            continue;
        }

        const page = await doc.getPage(i+1);
        const text = await page.getTextContent();

        // Start a new row for this page
        if (currentRow !== undefined) {
            rows.push(currentRow);
            currentRow = undefined;
        }

        // Get the position of each item in page space first and remove any zero size items
        const items: TextItemWithPosition[] = (text.items as TextItem[])
            .filter((item => item.width > 0 && item.height > 0))
            .map((item => {
                const [left, top] = _transform(0, 0, item.transform);
                return {
                    ...item,
                    x: left,
                    y: top
                }
            }));

        // If there are no text items on this page then skip to the next page
        if (items.length === 0) {
            continue;
        }

        // Find the minimum height of any element. We will use this to determine the
        // tolerance for deciding if two items are on the same line or not.
        const minHeight = Math.max(Math.min(...items.map((item) => item.height)), 0.001);
        const yTolerance = minHeight / 2;

        // Sort the items by x and y positions
        items.sort((a, b) => {
            if (a.y >= (b.y + yTolerance)) return -1;
            if (a.y < (b.y - yTolerance)) return 1;
            if (a.x < b.x) return -1;
            if (a.x > b.x) return 1;
            return 0;
        });

        // Build a list of rows
        for (const item of items) {
            // Check if this item starts a new row
            if (currentRow === undefined ||
                    item.y < (currentRow.y - yTolerance) ||
                    (item.y >= (currentRow.y + yTolerance))) {
                // Add the current row to the list of rows
                if (currentRow !== undefined) {
                    rows.push(currentRow);
                    currentRow = undefined;
                }

                // And start a new row
                currentRow = {
                    page: i,
                    rowNumber: rows.length,
                    y: item.y,
                    xs: [item.x],
                    items: [item]
                }
            }
            else {
                // Else add to the current row
                currentRow.xs.push(item.x);
                currentRow.items.push(item);
            }
        }
    }

    // Add the final row if there is one
    if (currentRow !== undefined) {
        rows.push(currentRow);
    }

    // Apply any filters
    if (!!options?.stripFooters) {
        rows = stripFooters(rows,
            typeof(options.stripFooters) === 'boolean' ? undefined : options.stripFooters);
    }

    if (!!options?.stripSuperscript) {
        rows = stripSuperscripts(rows,
            typeof(options.stripSuperscript) === 'boolean' ? undefined : options.stripSuperscript);
    }

    if (!!options?.slice) {
        rows = applySlice(rows,
            typeof(options.slice) === 'boolean' ? undefined : options.slice);
    }

    return rows.map((row) => {
        return row.items.map((item) => item.str);
    })
}
